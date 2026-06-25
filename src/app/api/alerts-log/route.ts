import { NextRequest, NextResponse } from 'next/server';
import { getAllAlertsLog, updateAlertLog } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const data = await getAllAlertsLog();
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json({ data: [], error: String(err) }, { status: 200 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId, ...patch } = body;
    if (!alertId) {
      return NextResponse.json({ success: false, error: 'alertId required' }, { status: 400 });
    }
    const ok = await updateAlertLog(alertId, patch);
    if (!ok) return NextResponse.json({ success: false, error: 'Alert not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
