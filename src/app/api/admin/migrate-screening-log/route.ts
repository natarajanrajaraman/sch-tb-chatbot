// v1.5 — Hard migration for the Screening Referral Log schema change.
// Drops the v0.7 `outcome` column and the three legacy date columns
// (firstContactDate / firstFollowupDate / lastFollowupDate) by:
//   1. Re-writing row 1 with the new REFERRAL_LOG_HEADERS (30 cols, A-AG)
//   2. Wiping ALL data rows so the cells beneath each renamed column
//      don't carry old values into the new semantics.
//
// This is a hard wipe — appropriate for prototype testing only. Do not
// run against production data.

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { seedHeaders, REFERRAL_LOG_HEADERS } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

function getSheets() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });
  return google.sheets({ version: 'v4', auth });
}

async function handle() {
  try {
    // 1. Rewrite the header row
    const seeded = await seedHeaders([
      { sheetName: 'Screening Referral Log', headers: REFERRAL_LOG_HEADERS },
    ]);

    // 2. Wipe all data rows (everything below row 1, across the full new
    //    column extent A-AG)
    const sheets = getSheets();
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Screening Referral Log!A2:AG10000',
    });

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
