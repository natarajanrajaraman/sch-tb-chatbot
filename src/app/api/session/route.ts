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
      landingChoice: body.landingChoice || '',
      clientName: body.clientName || '',
      clientAge: body.clientAge?.toString() || '',
      clientGender: body.clientGender || '',
      symptoms: body.symptoms || {},
      riskFactors: body.riskFactors || {},
      classification: body.classification || '',
      referralType: body.referralType || 'None',
      consentToPhoneContact: body.consentToPhoneContact === true
        ? 'Yes'
        : body.consentToPhoneContact === false
          ? 'No'
          : '',
      referralStateRegion: body.referralStateRegion || '',
      referralDistrict: body.referralDistrict || '',
      referralTownship: body.referralTownship || '',
      clientPhone: body.clientPhone || '',
      referralSitesShown: Array.isArray(body.referralSitesShown)
        ? body.referralSitesShown.join(', ')
        : (body.referralSitesShown || ''),
      status: body.status || 'completed',
      under15Excluded: body.under15Excluded ? 'Yes' : 'No',
      screeningId: body.screeningId || '',
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
        Array.isArray(body.referralSitesShown)
          ? body.referralSitesShown.join(', ')
          : (body.referralSitesShown || ''),
        'Referred',
        body.screeningId || ''
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
