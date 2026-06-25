import { NextRequest, NextResponse } from 'next/server';
import { getAllReferralLogs, updateReferralLogFollowUp, REFERRAL_LOG_HEADERS } from '@/lib/googleSheets';

const IMPLICIT_SNOOZE_DAYS = 7;

function todayPlusISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

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
    // v1.6 — Implicit snooze: when contactAttempts increments without
    // an explicit snoozeUntil in the same PUT, push the overdue clock
    // out by IMPLICIT_SNOOZE_DAYS so the row drops out of the overdue
    // queue. Tele-Health team gets breathing room after each contact.
    let snoozeUntil: string | undefined = body.snoozeUntil;
    if (snoozeUntil === undefined && body.contactAttempts !== undefined) {
      const newAttempts = parseInt(String(body.contactAttempts), 10);
      if (Number.isFinite(newAttempts) && newAttempts > 0) {
        // Compare to the existing row's contactAttempts.
        const all = await getAllReferralLogs();
        const headers = all[0] || REFERRAL_LOG_HEADERS;
        const caIdx = headers.findIndex(h => h === 'contactAttempts');
        const row = all.slice(1).find(r => r[0] === id);
        const prev = row ? parseInt((row[caIdx] || '0').trim(), 10) || 0 : 0;
        if (newAttempts > prev) {
          snoozeUntil = todayPlusISO(IMPLICIT_SNOOZE_DAYS);
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
      // v1.5 — 6 role-stamped contact dates (auto-suggested today by role,
      // editable by everyone for back-fill)
      firstContactTelehealthDate: body.firstContactTelehealthDate,
      lastContactTelehealthDate: body.lastContactTelehealthDate,
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
