import { NextResponse } from 'next/server';
import { getLanguageMap } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const map = await getLanguageMap();
    return NextResponse.json({ map }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json(
      { map: {}, error: String(err) },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
