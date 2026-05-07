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
    const success = await updateReferralLogFollowUp(body.referralId, {
      contactAttempts: body.contactAttempts || '',
      clientContacted: body.clientContacted || '',
      referralGivenByTelehealth: body.referralGivenByTelehealth || '',
      arrivedAtCenter: body.arrivedAtCenter || '',
      cxrCompleted: body.cxrCompleted || '',
      cxrResult: body.cxrResult || '',
      xpertCompleted: body.xpertCompleted || '',
      xpertResult: body.xpertResult || '',
    });
    if (!success) {
      return NextResponse.json({ success: false, error: 'Referral ID not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating referral log:', error);
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
  }
}
