// Google Sheets integration using the OpenClaw auth module
// For local development, calls the gsheets.js CLI tool
// For production, uses direct API calls

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '1Ri-Qok_oaRNhJqSTZXaL-gnr2imbJityXVWvRGMUhLU';
const GSHEETS_SCRIPT = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  '.openclaw',
  'skills',
  'google-sheets',
  'scripts',
  'gsheets.js'
);

async function runGSheets(command: string, args: string[]): Promise<string> {
  const escapedArgs = args.map(a => `"${a.replace(/"/g, '\\"')}"`).join(' ');
  const cmd = `node "${GSHEETS_SCRIPT}" ${command} ${escapedArgs}`;
  try {
    const { stdout } = await execAsync(cmd, { timeout: 15000 });
    return stdout;
  } catch (error) {
    console.error('Google Sheets API error:', error);
    throw error;
  }
}

export async function appendToSheet(sheetName: string, values: string[][]): Promise<void> {
  const valuesJson = JSON.stringify(values);
  await runGSheets('append', [SPREADSHEET_ID, `${sheetName}!A:Z`, valuesJson]);
}

export async function getSheetValues(sheetName: string, range: string): Promise<string[][]> {
  const result = await runGSheets('get', [SPREADSHEET_ID, '--values', `${sheetName}!${range}`]);
  const parsed = JSON.parse(result);
  return parsed.values || [];
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

    // Match by township (case-insensitive, partial match)
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
  ];

  await appendToSheet('Sessions', [row]);
}

export async function saveFeedback(feedbackId: string, conversationId: string, feedbackText: string, platformView: string): Promise<void> {
  const timestamp = new Date().toISOString();
  await appendToSheet('Feedback', [[feedbackId, conversationId, timestamp, feedbackText, platformView]]);
}

export async function saveReferralLog(
  referralId: string, conversationId: string, clientName: string,
  clientAge: string, clientGender: string, referralType: string,
  township: string, facilityNames: string, status: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  await appendToSheet('Referral Log', [
    [referralId, conversationId, timestamp, clientName, clientAge, clientGender, referralType, township, facilityNames, 'Yes', status],
  ]);
}

export async function getAllSessions(): Promise<string[][]> {
  try {
    return await getSheetValues('Sessions', 'A1:Y1000');
  } catch {
    return [];
  }
}

export async function getAllFeedback(): Promise<string[][]> {
  try {
    return await getSheetValues('Feedback', 'A1:E1000');
  } catch {
    return [];
  }
}

export async function getAllReferralLogs(): Promise<string[][]> {
  try {
    return await getSheetValues('Referral Log', 'A1:K1000');
  } catch {
    return [];
  }
}
