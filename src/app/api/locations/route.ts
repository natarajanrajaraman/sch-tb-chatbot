import { NextResponse } from 'next/server';
import { getLocationHierarchy } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const rows = await getLocationHierarchy();
    return NextResponse.json(
      { rows },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    return NextResponse.json(
      { rows: [], error: String(err) },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
