import { NextRequest, NextResponse } from 'next/server';
import { getReferralSites } from '@/lib/googleSheets';

export async function GET(request: NextRequest) {
  const township = request.nextUrl.searchParams.get('township') || '';

  if (!township) {
    return NextResponse.json({ sites: [], error: 'Township parameter required' }, { status: 400 });
  }

  try {
    const sites = await getReferralSites(township);
    return NextResponse.json({ sites });
  } catch (error) {
    console.error('Error fetching referral sites:', error);
    return NextResponse.json({ sites: [], error: 'Failed to fetch referral sites' }, { status: 500 });
  }
}
