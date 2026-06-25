import { NextRequest, NextResponse } from 'next/server';
import { getAllReferralLogs, updateReferralLogFollowUp } from '@/lib/googleSheets';

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
      // v1.5 — written; v1.6 will consume for journey-state computation
      removalReason: body.removalReason,
      removedAt: body.removedAt,
      snoozeUntil: body.snoozeUntil,
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
