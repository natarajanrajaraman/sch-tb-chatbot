import { NextRequest, NextResponse } from 'next/server';
import { getAllCareReferralLogs, saveCareReferralLog, updateCareReferralLog } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const data = await getAllCareReferralLogs();
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json({ data: [], error: String(err) }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const careReferralId = body.careReferralId || `CR-${Date.now()}`;
    await saveCareReferralLog({
      careReferralId,
      conversationId: body.conversationId || '',
      timestamp: body.timestamp || new Date().toISOString(),
      clientName: body.clientName || '',
      clientAge: body.clientAge?.toString() || '',
      clientGender: body.clientGender || '',
      careProviderName: body.careProviderName || '',
      careProviderTownship: body.careProviderTownship || '',
      careProviderContact: body.careProviderContact || '',
      reasonForReferral: body.reasonForReferral || '',
      status: body.status || 'Pending',
      followUpDate: body.followUpDate || '',
      notes: body.notes || '',
      patientTbCaseId: body.patientTbCaseId || '',
      patientContact: body.patientContact || '',
    });
    return NextResponse.json({ success: true, careReferralId });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { careReferralId, ...patch } = body;
    if (!careReferralId) {
      return NextResponse.json({ success: false, error: 'careReferralId required' }, { status: 400 });
    }
    const ok = await updateCareReferralLog(careReferralId, patch);
    if (!ok) return NextResponse.json({ success: false, error: 'Care referral not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
