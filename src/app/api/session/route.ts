import { NextRequest, NextResponse } from 'next/server';
import { saveSession, saveReferralLog, getAllSessions } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    await saveSession({
      conversationId: body.conversationId,
      startedAt: body.startedAt,
      completedAt: body.completedAt || new Date().toISOString(),
      platformView: body.platformView,
      clientName: body.clientName || '',
      clientAge: body.clientAge?.toString() || '',
      clientGender: body.clientGender || '',
      conditionDm: body.conditionDm ? 'Yes' : 'No',
      conditionHiv: body.conditionHiv ? 'Yes' : 'No',
      symptoms: body.symptoms || {},
      classification: body.classification || '',
      referralType: body.referralType || 'None',
      referralTownship: body.referralTownship || '',
      clientPhone: body.clientPhone || '',
      clientAddress: body.clientAddress || '',
      referralSitesShown: body.referralSitesShown?.join(', ') || '',
      status: body.status || 'completed',
      under15Excluded: body.under15Excluded ? 'Yes' : 'No',
      botVersion: body.botVersion || '',
    });

    // If there's a referral, also log it
    if (body.referralType && body.referralType !== 'None') {
      await saveReferralLog(
        `REF-${Date.now()}`,
        body.conversationId,
        body.clientName || '',
        body.clientAge?.toString() || '',
        body.clientGender || '',
        body.referralType,
        body.referralTownship || '',
        body.referralSitesShown?.join(', ') || '',
        'Referred'
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving session:', error);
    return NextResponse.json({ success: false, error: 'Failed to save session' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const data = await getAllSessions();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error getting sessions:', error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
