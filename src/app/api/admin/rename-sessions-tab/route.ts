// v1.7.4 — Rename the "Sessions" tab to "Self-Check Log".
// Idempotent: if the renamed tab already exists, returns alreadyDone=true.

import { NextResponse } from 'next/server';
import { renameSessionsTab } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function handle() {
  try {
    const result = await renameSessionsTab();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
