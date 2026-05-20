import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '1WNOvqyienkQNjF5ECUIPq5w30qaAVDQe0cuJrBv2P6w';

function getAuth() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env var is not set');
  const credentials = JSON.parse(keyJson);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
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

export interface SessionRow {
  conversationId: string;
  startedAt: string;
  completedAt: string;
  platformView: string;
  clientName: string;
  clientAge: string;
  clientGender: string;
  conditionDm: string;
  conditionHiv: string;
  symptoms: Record<string, boolean>;
  classification: string;
  referralType: string;
  referralTownship: string;
  clientPhone: string;
  clientAddress: string;
  referralSitesShown: string;
  status: string;
  under15Excluded: string;
  screeningId: string;
  botVersion: string;
}

export async function saveSession(session: SessionRow): Promise<void> {
  const symptomKeys = [
    'symptom_1_cough_2wks', 'symptom_2_phlegm_blood', 'symptom_3_fever_2wks',
    'symptom_4_appetite_weight_loss', 'symptom_5_back_chest_pain', 'symptom_6_shortness_breath',
    'symptom_7_other_symptoms', 'symptom_8_tb_contact',
  ];

  const row = [
    session.conversationId,
    session.startedAt,
    session.completedAt || '',
    session.platformView,
    session.clientName || '',
    session.clientAge || '',
    session.clientGender || '',
    session.conditionDm,
    session.conditionHiv,
    ...symptomKeys.map(k => session.symptoms[k] ? 'Yes' : 'No'),
    session.classification || '',
    session.referralType || '',
    session.referralTownship || '',
    session.clientPhone || '',
    session.clientAddress || '',
    session.referralSitesShown || '',
    session.status,
    session.under15Excluded,
    session.screeningId || '',
    session.botVersion || '',
  ];

  await appendToSheet('Sessions', [row]);
}

export async function saveFeedback(feedbackId: string, conversationId: string, feedbackText: string, platformView: string, snapshot: string = ''): Promise<void> {
  const timestamp = new Date().toISOString();
  await appendToSheet('Feedback', [[feedbackId, conversationId, timestamp, feedbackText, platformView, snapshot]]);
}

export async function saveReferralLog(
  referralId: string, conversationId: string, clientName: string,
  clientAge: string, clientGender: string, referralType: string,
  township: string, facilityNames: string, status: string,
  screeningId: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  await appendToSheet('Referral Log', [
    [referralId, conversationId, timestamp, clientName, clientAge, clientGender, referralType, township, facilityNames, 'Yes', status, screeningId],
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

export async function updateReferralLogFollowUp(
  referralId: string,
  followUp: {
    contactAttempts: string;
    clientContacted: string;
    referralGivenByTelehealth: string;
    arrivedAtCenter: string;
    cxrCompleted: string;
    cxrResult: string;
    xpertCompleted: string;
    xpertResult: string;
  }
): Promise<boolean> {
  const allData = await getSheetValues('Referral Log', 'A1:T1000');
  const rowIndex = allData.findIndex(row => row[0] === referralId);
  if (rowIndex < 0) return false;

  const sheetRow = rowIndex + 1;
  const values = [[
    followUp.contactAttempts,
    followUp.clientContacted,
    followUp.referralGivenByTelehealth,
    followUp.arrivedAtCenter,
    followUp.cxrCompleted,
    followUp.cxrResult,
    followUp.xpertCompleted,
    followUp.xpertResult,
  ]];
  await updateSheetCells('Referral Log', `L${sheetRow}:S${sheetRow}`, values);
  return true;
}

export async function getAllReferralLogs(): Promise<string[][]> {
  try {
    return await getSheetValues('Referral Log', 'A1:T1000');
  } catch {
    return [];
  }
}
