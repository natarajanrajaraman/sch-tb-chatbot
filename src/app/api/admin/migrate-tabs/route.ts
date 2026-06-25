import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuth } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// v1.2 — one-shot migration that renames legacy sheet tabs:
//   - "Referral Log"      -> "Screening Referral Log"
//   - "P3 Conversations"  -> "AI Conversations"
//
// Idempotent: if the legacy name doesn't exist, the rename is skipped.
// If the target name already exists (e.g. seed-headers created an empty
// twin), we leave both intact and surface a warning so the operator can
// resolve manually.

const RENAMES = [
  { from: 'Referral Log', to: 'Screening Referral Log' },
  { from: 'P3 Conversations', to: 'AI Conversations' },
];

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '1WNOvqyienkQNjF5ECUIPq5w30qaAVDQe0cuJrBv2P6w';

async function run() {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() });
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const allTabs = (meta.data.sheets || []).map(s => ({
    sheetId: s.properties?.sheetId,
    title: s.properties?.title,
  }));

  const result: { from: string; to: string; status: string; detail?: string }[] = [];
  const requests: object[] = [];

  for (const { from, to } of RENAMES) {
    const legacy = allTabs.find(t => t.title === from);
    const target = allTabs.find(t => t.title === to);
    if (!legacy) {
      result.push({ from, to, status: 'skipped', detail: 'Legacy tab not found — already renamed or never existed.' });
      continue;
    }
    if (target) {
      result.push({
        from, to,
        status: 'conflict',
        detail: `Target name "${to}" already exists as a separate tab (likely an empty twin created by seed-headers). Resolve manually: either delete the empty "${to}" if you want the data from "${from}" under the new name, or copy any data out of "${to}" first.`,
      });
      continue;
    }
    requests.push({
      updateSheetProperties: {
        properties: { sheetId: legacy.sheetId, title: to },
        fields: 'title',
      },
    });
    result.push({ from, to, status: 'renamed' });
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests },
    });
  }

  return result;
}

async function handle() {
  try {
    const result = await run();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export const GET = handle;
export const POST = handle;
