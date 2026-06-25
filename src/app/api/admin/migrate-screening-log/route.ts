// v1.5 — Hard migration for the Screening Referral Log schema change.
// Drops the v0.7 `outcome` column and the three legacy date columns
// (firstContactDate / firstFollowupDate / lastFollowupDate) by:
//   1. Re-writing row 1 with the new REFERRAL_LOG_HEADERS (33 cols, A-AG)
//   2. Wiping ALL data rows so the cells beneath each retired column
//      don't carry old values into the new semantics.
//
// This is a hard wipe — appropriate for prototype testing only. Do not
// run against production data.

import { NextResponse } from 'next/server';
import {
  seedHeaders,
  REFERRAL_LOG_HEADERS,
  clearScreeningReferralLogDataRows,
} from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function handle() {
  try {
    const seeded = await seedHeaders([
      { sheetName: 'Screening Referral Log', headers: REFERRAL_LOG_HEADERS },
    ]);
    await clearScreeningReferralLogDataRows();

    return NextResponse.json({
      ok: true,
      headersSeeded: seeded,
      dataWiped: true,
      newColumnCount: REFERRAL_LOG_HEADERS.length,
      note: 'v1.5 schema applied. Existing test rows have been wiped.',
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
