import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '1WNOvqyienkQNjF5ECUIPq5w30qaAVDQe0cuJrBv2P6w';

// v1.0.0 — also includes Drive scope for transcript writes. The service
// account only sees Drive folders explicitly shared with it.
export function getAuth() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env var is not set');
  const credentials = JSON.parse(keyJson);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });
}

function getSheets() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

export async function appendToSheet(sheetName: string, values: string[][]): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

export async function getSheetValues(sheetName: string, range: string): Promise<string[][]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${range}`,
  });
  return (res.data.values as string[][]) || [];
}

export async function updateSheetCells(sheetName: string, range: string, values: string[][]): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${range}`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

// TODO: REPLACE WITH SCH'S AUTHORITATIVE TB SERVICE DIRECTORY.
// Q14 (NoMs 2026-06-23): SCH will provide (i) NTP's TB service directory
// (with NTP approval) and (ii) the Sun GP TB service directory. Until those
// arrive, the 'Referral Directory' tab holds a placeholder schema —
// columns: site_id, facility_name, facility_name_mm, township, township_mm,
// address, phone, services, operating_hours, type, notes.
// When the official files land, align this loader to whatever columns they
// expose (the eventual schema may also need a state_region + district
// column, plus a 'service availability' field, to match Q15/Q16).
export async function getReferralSites(township: string): Promise<Record<string, string>[]> {
  try {
    const values = await getSheetValues('Referral Directory', 'A2:K100');
    const headers = ['site_id', 'facility_name', 'facility_name_mm', 'township', 'township_mm', 'address', 'phone', 'services', 'operating_hours', 'type', 'notes'];

    const allSites = values.map(row => {
      const site: Record<string, string> = {};
      headers.forEach((h, i) => {
        site[h] = row[i] || '';
      });
      return site;
    });

    const searchLower = township.toLowerCase().trim();
    const matched = allSites.filter(s =>
      s.township.toLowerCase().includes(searchLower) ||
      s.township_mm.includes(township) ||
      searchLower.includes(s.township.toLowerCase())
    );

    return matched.slice(0, 3);
  } catch (error) {
    console.error('Error fetching referral sites:', error);
    return [];
  }
}

// v0.4 schema. New columns AB+ are additive; old (v0.3) rows have empty
// values for the trailing columns. Run /api/admin/seed-headers once after
// deploy to refresh the header row.
export interface SessionRow {
  conversationId: string;
  startedAt: string;
  completedAt: string;
  platformView: string;
  landingChoice: string;
  ageGroup: string;            // v0.7 — under_5 / pediatric / adult
  clientName: string;
  clientAge: string;
  clientGender: string;
  symptoms: Record<string, boolean>;
  riskFactors: Record<string, boolean>;
  classification: string;
  referralType: string;
  consentToPhoneContact: string;
  referralStateRegion: string;
  referralDistrict: string;
  referralTownship: string;
  clientPhone: string;
  referralSitesShown: string;
  status: string;
  under15Excluded: string;
  screeningId: string;
  botVersion: string;
  transcriptUrl?: string;        // v1.0.0
}

export const SESSIONS_HEADERS = [
  'conversationId', 'startedAt', 'completedAt', 'platformView',     // A-D
  'landingChoice',                                                  // E
  'ageGroup',                                                       // F — v0.7
  'clientName', 'clientAge', 'clientGender',                        // G-I
  // 8 symptoms
  'sym_cough_2wks', 'sym_cough_blood_phlegm', 'sym_appetite_loss',
  'sym_weight_loss_gradual', 'sym_fever_night_sweats', 'sym_chest_back_pain',
  'sym_fever_2wks', 'sym_other_fatigue_neck_lump',
  // 10 risk factors
  'rf_tb_contact', 'rf_immunocompromised', 'rf_diabetes',
  'rf_malnutrition', 'rf_alcohol_heavy', 'rf_smoking',
  'rf_age_60_plus', 'rf_prior_tb', 'rf_chronic_lung', 'rf_crowded_living',
  // Classification + referral
  'classification', 'referralType', 'consentToPhoneContact',
  'referralStateRegion', 'referralDistrict', 'referralTownship',
  'clientPhone', 'referralSitesShown',
  // Status + meta
  'status', 'under15Excluded', 'screeningId', 'botVersion',
  // v1.0.0 — Drive web view URL for the conversation transcript
  'transcriptUrl',
];

export async function saveSession(session: SessionRow): Promise<void> {
  const symKeys = [
    'sym_cough_2wks', 'sym_cough_blood_phlegm', 'sym_appetite_loss',
    'sym_weight_loss_gradual', 'sym_fever_night_sweats', 'sym_chest_back_pain',
    'sym_fever_2wks', 'sym_other_fatigue_neck_lump',
  ];
  const rfKeys = [
    'rf_tb_contact', 'rf_immunocompromised', 'rf_diabetes',
    'rf_malnutrition', 'rf_alcohol_heavy', 'rf_smoking',
    'rf_age_60_plus', 'rf_prior_tb', 'rf_chronic_lung', 'rf_crowded_living',
  ];
  const ynBlank = (v: boolean | undefined) =>
    v === true ? 'Yes' : v === false ? 'No' : '';

  const row = [
    session.conversationId,
    session.startedAt,
    session.completedAt || '',
    session.platformView,
    session.landingChoice || '',
    session.ageGroup || '',
    session.clientName || '',
    session.clientAge || '',
    session.clientGender || '',
    ...symKeys.map(k => ynBlank(session.symptoms[k])),
    ...rfKeys.map(k => ynBlank(session.riskFactors[k])),
    session.classification || '',
    session.referralType || '',
    session.consentToPhoneContact || '',
    session.referralStateRegion || '',
    session.referralDistrict || '',
    session.referralTownship || '',
    session.clientPhone || '',
    session.referralSitesShown || '',
    session.status,
    session.under15Excluded,
    session.screeningId || '',
    session.botVersion || '',
    session.transcriptUrl || '',
  ];

  await appendToSheet('Sessions', [row]);
}

export async function saveFeedback(feedbackId: string, conversationId: string, feedbackText: string, platformView: string, snapshot: string = ''): Promise<void> {
  const timestamp = new Date().toISOString();
  await appendToSheet('Feedback', [[feedbackId, conversationId, timestamp, feedbackText, platformView, snapshot]]);
}

export async function saveReferralLog(
  screeningReferralId: string, conversationId: string, clientName: string,
  clientAge: string, clientGender: string, referralType: string,
  township: string, facilityNames: string, status: string,
  screeningId: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  await appendToSheet('Screening Referral Log', [
    [screeningReferralId, conversationId, timestamp, clientName, clientAge, clientGender, referralType, township, facilityNames, 'Yes', status, screeningId],
  ]);
}

export async function getAllSessions(): Promise<string[][]> {
  try {
    return await getSheetValues('Sessions', 'A1:AA1000');
  } catch {
    return [];
  }
}

export async function getAllFeedback(): Promise<string[][]> {
  try {
    return await getSheetValues('Feedback', 'A1:F1000');
  } catch {
    return [];
  }
}

// v0.7 Referral Log schema additions — outcome enum + SLA dates + final dx,
// per the old SCH FB bot's "Reached / Lost / Referred" model. Old columns
// (A-T = referralId..xpertResult) are unchanged; new columns extend to AB.
export const REFERRAL_LOG_HEADERS = [
  // A-L  — column A renamed referralId → screeningReferralId in v0.8 to
  // disambiguate from careReferralId on the Care Referral Log tab.
  'screeningReferralId', 'conversationId', 'timestamp', 'clientName',
  'clientAge', 'clientGender', 'referralType', 'township',
  'facilityNames', 'referred', 'status', 'screeningId',
  // M-T  (telehealth-editable follow-up — bug fix: writes now start at M, not L)
  'contactAttempts', 'clientContacted', 'referralGivenByTelehealth',
  'arrivedAtCenter', 'cxrCompleted', 'cxrResult',
  'xpertCompleted', 'xpertResult',
  // U-AB  (v0.7 — old SCH FB bot's outcome / SLA / final dx model)
  'outcome',          // Pending / Referred / Reached / Lost
  'patientDx',        // TB / Non-TB
  'tbRegistrationId',
  'tbRegistrationDate',
  'firstContactDate',
  'firstFollowupDate',
  'lastFollowupDate',
  'remarks',
];

export interface ReferralFollowUp {
  contactAttempts?: string;
  clientContacted?: string;
  referralGivenByTelehealth?: string;
  arrivedAtCenter?: string;
  cxrCompleted?: string;
  cxrResult?: string;
  xpertCompleted?: string;
  xpertResult?: string;
  // v0.7
  outcome?: string;
  patientDx?: string;
  tbRegistrationId?: string;
  tbRegistrationDate?: string;
  firstContactDate?: string;
  firstFollowupDate?: string;
  lastFollowupDate?: string;
  remarks?: string;
}

const EDITABLE_FOLLOWUP_KEYS: (keyof ReferralFollowUp)[] = [
  'contactAttempts', 'clientContacted', 'referralGivenByTelehealth',
  'arrivedAtCenter', 'cxrCompleted', 'cxrResult',
  'xpertCompleted', 'xpertResult',
  'outcome', 'patientDx', 'tbRegistrationId', 'tbRegistrationDate',
  'firstContactDate', 'firstFollowupDate', 'lastFollowupDate', 'remarks',
];

export async function updateReferralLogFollowUp(
  screeningReferralId: string,
  followUp: ReferralFollowUp
): Promise<boolean> {
  const allData = await getSheetValues('Screening Referral Log', 'A1:AB2000');
  const rowIndex = allData.findIndex(row => row[0] === screeningReferralId);
  if (rowIndex < 0) return false;

  const sheetRow = rowIndex + 1;
  const existingRow = allData[rowIndex] || [];

  // Build values for columns M..AB (16 cells, 1-indexed columns 13..28).
  // The previous code wrote to L:S which clobbered the screeningId column —
  // L is column 12 = screeningId. This is now corrected.
  const values = [EDITABLE_FOLLOWUP_KEYS.map(key => {
    const headerIdx = REFERRAL_LOG_HEADERS.indexOf(key);
    const next = followUp[key];
    if (next !== undefined) return next;
    return existingRow[headerIdx] || '';
  })];
  await updateSheetCells('Screening Referral Log', `M${sheetRow}:AB${sheetRow}`, values);
  return true;
}

export async function getAllReferralLogs(): Promise<string[][]> {
  try {
    return await getSheetValues('Screening Referral Log', 'A1:AB2000');
  } catch {
    return [];
  }
}

// ----- Care Referral Log -----
// New tab introduced in v0.6 for referrals to TB care providers (e.g.
// initiated during the P3 patient/caregiver conversation). Kept separate from
// the screening-referral flow so the SCH Telehealth team's caseload stays
// distinct from the TB Care Provider's caseload.
//
// Schema (provisional — TODO realign with SCH care-provider directory once
// available):
//   A  careReferralId
//   B  conversationId
//   C  timestamp
//   D  clientName
//   E  clientAge
//   F  clientGender
//   G  careProviderName
//   H  careProviderTownship
//   I  careProviderContact
//   J  reasonForReferral
//   K  status              (Pending / Contacted / In Care / Closed / Lost)
//   L  followUpDate
//   M  notes
export const CARE_REFERRAL_LOG_HEADERS = [
  'careReferralId', 'conversationId', 'timestamp',
  'clientName', 'clientAge', 'clientGender',
  'careProviderName', 'careProviderTownship', 'careProviderContact',
  'reasonForReferral',
  'status', 'followUpDate', 'notes',
  // v0.9 — patient-provided TB case ID, captured ONLY at care-referral
  // time (with explicit Skip). Never linked across sessions. Optional.
  'patientTbCaseId',
  // v0.9.3 — patient-provided contact info (phone / Viber number /
  // similar) needed for SCH Tele-Health to actually reach the user.
  // Same posture as patientTbCaseId: optional, explicit Skip,
  // per-row only. Without this, the bot is no longer allowed to
  // promise a callback — it directs the user to contact Tele-Health
  // themselves.
  'patientContact',
];

export async function saveCareReferralLog(row: Record<string, string>): Promise<void> {
  const ordered = CARE_REFERRAL_LOG_HEADERS.map(h => row[h] || '');
  await appendToSheet('Care Referral Log', [ordered]);
}

// ----- Alerts Log (v1.1) -----
// Written on every red-flag detection in /api/p3/chat regardless of
// whether the user proceeds with a care referral. This is the human-
// review queue separate from operational referral tracking — even
// abandoned conversations leave a row so a reviewer can audit them.
export const ALERTS_LOG_HEADERS = [
  'alertId',
  'conversationId',
  'alertTimestamp',
  'mode',                  // 'P1' | 'P3'
  'escalationLevel',       // 'immediate' | 'telehealth'
  'triggerReason',         // rule-based matches + LLM tag
  'userMessageSnippet',    // truncated user message that triggered the flag
  'careReferralId',        // optional — populated if a care referral row was minted in the same turn
  'transcriptUrl',         // optional — populated once we know the Drive link
  'reviewStatus',          // 'Open' | 'Reviewed' | 'Dismissed'
  'reviewerNotes',
  'reviewedAt',
  'reviewedBy',
];

export interface AlertLogRow {
  alertId: string;
  conversationId: string;
  alertTimestamp: string;
  mode: 'P1' | 'P3';
  escalationLevel: string;
  triggerReason: string;
  userMessageSnippet: string;
  careReferralId?: string;
  transcriptUrl?: string;
  reviewStatus?: string;
  reviewerNotes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export async function saveAlertLog(row: AlertLogRow): Promise<void> {
  const ordered = ALERTS_LOG_HEADERS.map(h => {
    const v = (row as unknown as Record<string, string | undefined>)[h];
    return v == null ? '' : String(v);
  });
  // Default review status if not provided
  const idx = ALERTS_LOG_HEADERS.indexOf('reviewStatus');
  if (!ordered[idx]) ordered[idx] = 'Open';
  await appendToSheet('Alerts Log', [ordered]);
}

export async function getAllAlertsLog(): Promise<string[][]> {
  try {
    return await getSheetValues('Alerts Log', 'A1:M2000');
  } catch {
    return [];
  }
}

export async function updateAlertLog(
  alertId: string,
  patch: Partial<Record<string, string>>
): Promise<boolean> {
  const allData = await getSheetValues('Alerts Log', 'A1:M2000');
  const rowIndex = allData.findIndex(row => row[0] === alertId);
  if (rowIndex < 0) return false;
  const sheetRow = rowIndex + 1;
  // Editable columns: J..M (reviewStatus, reviewerNotes, reviewedAt, reviewedBy)
  const editableCols = ['reviewStatus', 'reviewerNotes', 'reviewedAt', 'reviewedBy'];
  const values = [editableCols.map(c => patch[c] ?? allData[rowIndex][ALERTS_LOG_HEADERS.indexOf(c)] ?? '')];
  await updateSheetCells('Alerts Log', `J${sheetRow}:M${sheetRow}`, values);
  return true;
}

// ----- P3 Conversations (v0.9 telemetry) -----
export const P3_CONVERSATIONS_HEADERS = [
  'p3ConversationId', 'startedAt', 'lastMessageAt',
  'model',
  'userMessageCount', 'totalPromptTokens', 'totalCompletionTokens',
  'estCostUsd',
  'lastEscalationLevel',
  'escalationsCount',
  'careReferralIds',
  'platformView',
  'botVersion',
  // v1.0.0 — Drive web view URL for the conversation transcript
  'transcriptUrl',
];

export interface P3ConversationRow {
  p3ConversationId: string;
  startedAt: string;
  lastMessageAt: string;
  model: string;
  userMessageCount: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  estCostUsd: number;
  lastEscalationLevel: string;
  escalationsCount: number;
  careReferralIds: string;
  platformView: string;
  botVersion: string;
  transcriptUrl?: string;        // v1.0.0
}

export async function upsertP3Conversation(row: P3ConversationRow): Promise<void> {
  const allData = await getSheetValues('AI Conversations', 'A1:M5000').catch(() => []);
  const headers = allData[0] || P3_CONVERSATIONS_HEADERS;
  const idx = allData.findIndex((r, i) => i > 0 && r[0] === row.p3ConversationId);
  const ordered = P3_CONVERSATIONS_HEADERS.map(h => {
    const v = (row as unknown as Record<string, unknown>)[h];
    return v === undefined || v === null ? '' : String(v);
  });
  if (idx >= 0) {
    // Update existing row
    const sheetRow = idx + 1;
    await updateSheetCells('AI Conversations', `A${sheetRow}:${columnLetter(headers.length || P3_CONVERSATIONS_HEADERS.length)}${sheetRow}`, [ordered]);
  } else {
    await appendToSheet('AI Conversations', [ordered]);
  }
}

function columnLetter(n: number): string {
  let s = '';
  let x = n;
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s || 'A';
}

export async function getAllP3Conversations(): Promise<string[][]> {
  try {
    return await getSheetValues('AI Conversations', 'A1:M5000');
  } catch {
    return [];
  }
}

export async function getAllCareReferralLogs(): Promise<string[][]> {
  try {
    return await getSheetValues('Care Referral Log', 'A1:O2000');
  } catch {
    return [];
  }
}

export async function updateCareReferralLog(
  careReferralId: string,
  patch: Partial<Record<string, string>>
): Promise<boolean> {
  const allData = await getSheetValues('Care Referral Log', 'A1:O2000');
  const rowIndex = allData.findIndex(row => row[0] === careReferralId);
  if (rowIndex < 0) return false;
  const sheetRow = rowIndex + 1;
  // Update G..O cells (careProviderName .. patientContact)
  const editableCols = ['careProviderName', 'careProviderTownship', 'careProviderContact', 'reasonForReferral', 'status', 'followUpDate', 'notes', 'patientTbCaseId', 'patientContact'];
  const values = [editableCols.map(c => patch[c] ?? allData[rowIndex][CARE_REFERRAL_LOG_HEADERS.indexOf(c)] ?? '')];
  await updateSheetCells('Care Referral Log', `G${sheetRow}:O${sheetRow}`, values);
  return true;
}

// ----- Language Map -----
// Columns: A=key, B=english, C=burmese, D=notes
export interface LanguageMapEntry {
  en: string;
  mm: string;
  notes?: string;
}

export async function getLanguageMap(): Promise<Record<string, LanguageMapEntry>> {
  try {
    const values = await getSheetValues('Language Map', 'A2:D2000');
    const map: Record<string, LanguageMapEntry> = {};
    for (const row of values) {
      const key = (row?.[0] || '').toString().trim();
      if (!key) continue;
      map[key] = {
        en: (row?.[1] || '').toString(),
        mm: (row?.[2] || '').toString(),
        notes: (row?.[3] || '').toString(),
      };
    }
    return map;
  } catch (error) {
    console.error('getLanguageMap failed:', error);
    return {};
  }
}

async function ensureSheetTab(sheetName: string, headers: string[]): Promise<void> {
  const sheets = getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = (meta.data.sheets || []).some(
    s => s.properties?.title === sheetName
  );
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    });
  }
}

// ----- Location Hierarchy -----
// Columns: A=state_region_en B=state_region_mm C=district_en D=district_mm E=township_en F=township_mm
export interface LocationHierarchyRow {
  stateRegionEn: string;
  stateRegionMm: string;
  districtEn: string;
  districtMm: string;
  townshipEn: string;
  townshipMm: string;
}

export async function getLocationHierarchy(): Promise<LocationHierarchyRow[]> {
  try {
    const values = await getSheetValues('Location Hierarchy', 'A2:F5000');
    const rows: LocationHierarchyRow[] = [];
    for (const row of values) {
      const stateRegionEn = (row?.[0] || '').toString().trim();
      if (!stateRegionEn) continue;
      rows.push({
        stateRegionEn,
        stateRegionMm: (row?.[1] || '').toString().trim(),
        districtEn: (row?.[2] || '').toString().trim(),
        districtMm: (row?.[3] || '').toString().trim(),
        townshipEn: (row?.[4] || '').toString().trim(),
        townshipMm: (row?.[5] || '').toString().trim(),
      });
    }
    return rows;
  } catch (error) {
    console.error('getLocationHierarchy failed:', error);
    return [];
  }
}

export async function seedLocationHierarchy(
  rows: LocationHierarchyRow[]
): Promise<{ created: number; skippedExisting: number; tabCreated: boolean }> {
  const sheets = getSheets();
  const headers = [
    'state_region_en', 'state_region_mm',
    'district_en', 'district_mm',
    'township_en', 'township_mm',
  ];

  const metaBefore = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existedBefore = (metaBefore.data.sheets || []).some(
    s => s.properties?.title === 'Location Hierarchy'
  );

  await ensureSheetTab('Location Hierarchy', headers);

  // Read existing rows and de-dupe by (state, district, township)
  const existing = await getSheetValues('Location Hierarchy', 'A2:F5000');
  const existingKeys = new Set(
    existing
      .map(r => `${r?.[0] || ''}|${r?.[2] || ''}|${r?.[4] || ''}`.toLowerCase())
      .filter(k => k.length > 2)
  );

  const newRows = rows
    .filter(r => !existingKeys.has(`${r.stateRegionEn}|${r.districtEn}|${r.townshipEn}`.toLowerCase()))
    .map(r => [r.stateRegionEn, r.stateRegionMm, r.districtEn, r.districtMm, r.townshipEn, r.townshipMm]);

  if (newRows.length > 0) {
    await appendToSheet('Location Hierarchy', newRows);
  }

  return {
    created: newRows.length,
    skippedExisting: rows.length - newRows.length,
    tabCreated: !existedBefore,
  };
}

// ----- Header refresh (idempotent rewrite of row 1 per tab) -----
export async function seedHeaders(
  spec: { sheetName: string; headers: string[] }[]
): Promise<{ sheet: string; created: boolean; headerWritten: boolean }[]> {
  const sheets = getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existingTabs = new Set(
    (meta.data.sheets || []).map(s => s.properties?.title || '')
  );

  const out: { sheet: string; created: boolean; headerWritten: boolean }[] = [];
  for (const { sheetName, headers } of spec) {
    const created = !existingTabs.has(sheetName);
    if (created) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
      });
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    });
    out.push({ sheet: sheetName, created, headerWritten: true });
  }
  return out;
}

export async function seedLanguageMap(
  entries: { key: string; en: string; mm: string; notes?: string }[]
): Promise<{ created: number; skippedExisting: number; tabCreated: boolean }> {
  const sheets = getSheets();
  const headers = ['key', 'english', 'burmese', 'notes'];

  // Check if tab existed before we touched it
  const metaBefore = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existedBefore = (metaBefore.data.sheets || []).some(
    s => s.properties?.title === 'Language Map'
  );

  await ensureSheetTab('Language Map', headers);

  // Read existing keys so we don't overwrite tweaks
  const existing = await getSheetValues('Language Map', 'A2:A2000');
  const existingKeys = new Set(
    existing.map(r => (r?.[0] || '').toString().trim()).filter(Boolean)
  );

  const newRows = entries
    .filter(e => !existingKeys.has(e.key))
    .map(e => [e.key, e.en, e.mm, e.notes || '']);

  if (newRows.length > 0) {
    await appendToSheet('Language Map', newRows);
  }

  return {
    created: newRows.length,
    skippedExisting: entries.length - newRows.length,
    tabCreated: !existedBefore,
  };
}
