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
    // v1.6 / v1.7 — Implicit derivations when Tele-Health activity is
    // detected (contactAttempts incremented, or clientContacted just set
    // to 'Yes'):
    //   - snoozeUntil = today + 7d (unless explicitly set in this PUT) —
    //     drops the row out of the overdue queue for a week.
    //   - lastContactTelehealthDate = today (unless explicitly set).
    //   - firstContactTelehealthDate = today (only if still blank).
    let snoozeUntil: string | undefined = body.snoozeUntil;
    let firstContactTelehealthDate: string | undefined = body.firstContactTelehealthDate;
    let lastContactTelehealthDate: string | undefined = body.lastContactTelehealthDate;

    const needsImplicit =
      body.contactAttempts !== undefined ||
      body.clientContacted === 'Yes';

    if (needsImplicit) {
      const all = await getAllReferralLogs();
      const headers = all[0] || REFERRAL_LOG_HEADERS;
      const caIdx = headers.findIndex(h => h === 'contactAttempts');
      const clientContactedIdx = headers.findIndex(h => h === 'clientContacted');
      const firstThIdx = headers.findIndex(h => h === 'firstContactTelehealthDate');
      const row = all.slice(1).find(r => r[0] === id);
      const prevAttempts = row ? parseInt((row[caIdx] || '0').trim(), 10) || 0 : 0;
      const prevContacted = row ? (row[clientContactedIdx] || '').trim() : '';
      const prevFirstTh = row ? (row[firstThIdx] || '').trim() : '';

      const newAttempts = body.contactAttempts !== undefined
        ? parseInt(String(body.contactAttempts), 10) || 0
        : prevAttempts;
      const attemptsBumped = newAttempts > prevAttempts;
      const justContacted = body.clientContacted === 'Yes' && prevContacted !== 'Yes';
      const activitySignal = attemptsBumped || justContacted;

      if (activitySignal) {
        if (snoozeUntil === undefined) snoozeUntil = todayPlusISO(IMPLICIT_SNOOZE_DAYS);
        if (lastContactTelehealthDate === undefined) lastContactTelehealthDate = todayISO();
        if (firstContactTelehealthDate === undefined && !prevFirstTh) firstContactTelehealthDate = todayISO();
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
      // v1.5/v1.7 — 6 role-stamped contact dates. Tele-Health dates may be
      // implicitly auto-stamped above when contact activity is detected.
      firstContactTelehealthDate,
      lastContactTelehealthDate,
      firstContactScreeningProviderDate: body.firstContactScreeningProviderDate,
      lastContactScreeningProviderDate: body.lastContactScreeningProviderDate,
      firstContactCareProviderDate: body.firstContactCareProviderDate,
      lastContactCareProviderDate: body.lastContactCareProviderDate,
      // v1.6 — written + consumed by journey-state computation
      removalReason: body.removalReason,
      removedAt: body.removedAt,
      snoozeUntil,
      remarks: body.remarks,
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
