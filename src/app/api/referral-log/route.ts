import { NextRequest, NextResponse } from 'next/server';
import { getAllReferralLogs, updateReferralLogFollowUp, REFERRAL_LOG_HEADERS } from '@/lib/googleSheets';

const IMPLICIT_SNOOZE_DAYS = 7;

function todayPlusISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export async function GET() {
  try {
    const data = await getAllReferralLogs();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error getting referral logs:', error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    // v0.8 renamed referralId → screeningReferralId. Accept either field for
    // backward compat with any cached clients still posting the old name.
    const id = body.screeningReferralId || body.referralId;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'screeningReferralId required' },
        { status: 400 }
      );
    }
    // v1.6 / v1.7 — Implicit derivations when role-side activity is
    // detected. Same shape per role:
    //   - "last contact" date = today (unless explicitly set in this PUT)
    //   - "first contact" date = today (only if currently blank)
    // Tele-Health additionally gets a 7-day implicit snooze on activity.
    let snoozeUntil: string | undefined = body.snoozeUntil;
    let firstContactTelehealthDate: string | undefined = body.firstContactTelehealthDate;
    let lastContactTelehealthDate: string | undefined = body.lastContactTelehealthDate;
    let firstContactScreeningProviderDate: string | undefined = body.firstContactScreeningProviderDate;
    let lastContactScreeningProviderDate: string | undefined = body.lastContactScreeningProviderDate;
    let firstContactCareProviderDate: string | undefined = body.firstContactCareProviderDate;
    let lastContactCareProviderDate: string | undefined = body.lastContactCareProviderDate;

    // Load the prev row once if we need it.
    const needsTH =
      body.contactAttempts !== undefined || body.clientContacted === 'Yes';
    const needsSP =
      body.arrivedAtCenter !== undefined ||
      body.cxrCompleted !== undefined || body.cxrResult !== undefined ||
      body.xpertCompleted !== undefined || body.xpertResult !== undefined ||
      body.firstContactScreeningProviderDate !== undefined;
    const needsCP =
      body.firstContactCareProviderDate !== undefined ||
      body.careProviderReferralCompleted !== undefined;

    if (needsTH || needsSP || needsCP) {
      const all = await getAllReferralLogs();
      const headers = all[0] || REFERRAL_LOG_HEADERS;
      const colIdx = (n: string) => headers.findIndex(h => h === n);
      const row = all.slice(1).find(r => r[0] === id);
      const prev = (n: string) => row ? (row[colIdx(n)] || '').trim() : '';

      // --- Tele-Health ---
      if (needsTH) {
        const prevAttempts = parseInt(prev('contactAttempts') || '0', 10) || 0;
        const newAttempts = body.contactAttempts !== undefined
          ? parseInt(String(body.contactAttempts), 10) || 0
          : prevAttempts;
        const attemptsBumped = newAttempts > prevAttempts;
        const justContacted = body.clientContacted === 'Yes' && prev('clientContacted') !== 'Yes';
        if (attemptsBumped || justContacted) {
          if (snoozeUntil === undefined) snoozeUntil = todayPlusISO(IMPLICIT_SNOOZE_DAYS);
          if (lastContactTelehealthDate === undefined) lastContactTelehealthDate = todayISO();
          if (firstContactTelehealthDate === undefined && !prev('firstContactTelehealthDate')) {
            firstContactTelehealthDate = todayISO();
          }
        }
      }

      // --- Screening Provider ---
      // Activity if any SP test/arrival field is being SET (non-empty value
      // that differs from prev), or if firstContactSP is being set fresh.
      if (needsSP) {
        const spChanged = (k: string) => {
          const next = body[k];
          if (next === undefined) return false;
          const nextStr = String(next).trim();
          return !!nextStr && nextStr !== prev(k);
        };
        const spActivity =
          spChanged('arrivedAtCenter') ||
          spChanged('cxrCompleted') || spChanged('cxrResult') ||
          spChanged('xpertCompleted') || spChanged('xpertResult') ||
          spChanged('firstContactScreeningProviderDate');
        if (spActivity) {
          if (lastContactScreeningProviderDate === undefined) lastContactScreeningProviderDate = todayISO();
          if (firstContactScreeningProviderDate === undefined && !prev('firstContactScreeningProviderDate')) {
            firstContactScreeningProviderDate = todayISO();
          }
        }
      }

      // --- Care Provider ---
      if (needsCP) {
        const cpChanged = (k: string) => {
          const next = body[k];
          if (next === undefined) return false;
          const nextStr = String(next).trim();
          return !!nextStr && nextStr !== prev(k);
        };
        const cpActivity =
          cpChanged('firstContactCareProviderDate') ||
          cpChanged('careProviderReferralCompleted');
        if (cpActivity) {
          if (lastContactCareProviderDate === undefined) lastContactCareProviderDate = todayISO();
          if (firstContactCareProviderDate === undefined && !prev('firstContactCareProviderDate')) {
            firstContactCareProviderDate = todayISO();
          }
        }
      }
    }

    const success = await updateReferralLogFollowUp(id, {
      contactAttempts: body.contactAttempts,
      clientContacted: body.clientContacted,
      referralGivenByTelehealth: body.referralGivenByTelehealth,
      arrivedAtCenter: body.arrivedAtCenter,
      cxrCompleted: body.cxrCompleted,
      cxrResult: body.cxrResult,
      xpertCompleted: body.xpertCompleted,
      xpertResult: body.xpertResult,
      // v1.5 — final dx (radio: Confirmed TB +ve / Confirmed TB -ve / Pending)
      // TB registration fields gated UI-side on patientDx = Confirmed TB +ve
      patientDx: body.patientDx,
      tbRegistrationId: body.tbRegistrationId,
      tbRegistrationDate: body.tbRegistrationDate,
      // v1.5/v1.7 — 6 role-stamped contact dates. Each may be implicitly
      // auto-stamped above when that role's activity is detected.
      firstContactTelehealthDate,
      lastContactTelehealthDate,
      firstContactScreeningProviderDate,
      lastContactScreeningProviderDate,
      firstContactCareProviderDate,
      lastContactCareProviderDate,
      // v1.6 — written + consumed by journey-state computation
      removalReason: body.removalReason,
      removedAt: body.removedAt,
      snoozeUntil,
      remarks: body.remarks,
      // v1.7.3 — referral to TB Care Provider (Yes/No), gated UI-side
      // on patientDx ∈ {Confirmed TB +ve, Indeterminate}.
      careProviderReferralCompleted: body.careProviderReferralCompleted,
    });
    if (!success) {
      return NextResponse.json({ success: false, error: 'screeningReferralId not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating referral log:', error);
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
  }
}
