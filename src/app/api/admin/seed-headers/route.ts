import { NextResponse } from 'next/server';
import { seedHeaders, SESSIONS_HEADERS, CARE_REFERRAL_LOG_HEADERS, REFERRAL_LOG_HEADERS, P3_CONVERSATIONS_HEADERS } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SPEC = [
  { sheetName: 'Sessions', headers: SESSIONS_HEADERS },
  {
    sheetName: 'Feedback',
    headers: ['feedbackId', 'conversationId', 'timestamp', 'feedbackText', 'platformView', 'snapshot'],
  },
  {
    sheetName: 'Referral Log',
    headers: REFERRAL_LOG_HEADERS,
  },
  {
    sheetName: 'Language Map',
    headers: ['key', 'english', 'burmese', 'notes'],
  },
  {
    sheetName: 'Location Hierarchy',
    headers: ['state_region_en', 'state_region_mm', 'district_en', 'district_mm', 'township_en', 'township_mm'],
  },
  {
    // TODO: realign once SCH provides the authoritative directory.
    sheetName: 'Referral Directory',
    headers: ['site_id', 'facility_name', 'facility_name_mm', 'township', 'township_mm',
      'address', 'phone', 'services', 'operating_hours', 'type', 'notes'],
  },
  {
    sheetName: 'Care Referral Log',
    headers: CARE_REFERRAL_LOG_HEADERS,
  },
  {
    sheetName: 'P3 Conversations',
    headers: P3_CONVERSATIONS_HEADERS,
  },
];

async function handle() {
  try {
    const result = await seedHeaders(SPEC);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
