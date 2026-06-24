import { NextResponse } from 'next/server';
import { seedLocationHierarchy } from '@/lib/googleSheets';
import { LOCATION_SEED } from '@/data/locationSeed';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function handle() {
  try {
    const result = await seedLocationHierarchy(LOCATION_SEED);
    return NextResponse.json({
      ok: true,
      ...result,
      totalCandidates: LOCATION_SEED.length,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
