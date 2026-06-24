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
      // Existing follow-up fields
      contactAttempts: body.contactAttempts,
      clientContacted: body.clientContacted,
      referralGivenByTelehealth: body.referralGivenByTelehealth,
      arrivedAtCenter: body.arrivedAtCenter,
      cxrCompleted: body.cxrCompleted,
      cxrResult: body.cxrResult,
      xpertCompleted: body.xpertCompleted,
      xpertResult: body.xpertResult,
      // v0.7 outcome / SLA / final dx
      outcome: body.outcome,
      patientDx: body.patientDx,
      tbRegistrationId: body.tbRegistrationId,
      tbRegistrationDate: body.tbRegistrationDate,
      firstContactDate: body.firstContactDate,
      firstFollowupDate: body.firstFollowupDate,
      lastFollowupDate: body.lastFollowupDate,
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
