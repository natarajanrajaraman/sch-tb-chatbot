import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuth } from '@/lib/googleSheets';
import { parseDriveFolderId } from '@/lib/driveTranscript';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Looks up a transcript file by conversationId in the configured Drive
// folder and returns its webViewLink. Used by the dashboards as a
// fallback when the stored transcriptUrl on the row is missing or
// stale (e.g. older rows written before v1.0.0).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    if (!conversationId) {
      return NextResponse.json({ found: false, error: 'conversationId required' }, { status: 400 });
    }
    const rawFolder = process.env.GOOGLE_DRIVE_TRANSCRIPT_FOLDER_ID;
    if (!rawFolder) {
      return NextResponse.json(
        { found: false, error: 'GOOGLE_DRIVE_TRANSCRIPT_FOLDER_ID not set' },
        { status: 200 }
      );
    }
    const folderId = parseDriveFolderId(rawFolder);
    const drive = google.drive({ version: 'v3', auth: getAuth() });
    const safeName = `${conversationId}.md`.replace(/'/g, "\\'");
    const resp = await drive.files.list({
      q: `name = '${safeName}' and '${folderId}' in parents and trashed = false`,
      fields: 'files(id, webViewLink)',
      spaces: 'drive',
      pageSize: 1,
      // Shared Drive support
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    const f = resp.data.files?.[0];
    if (!f?.id) {
      return NextResponse.json({ found: false }, { status: 200 });
    }
    return NextResponse.json({
      found: true,
      fileId: f.id,
      webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
    });
  } catch (err) {
    return NextResponse.json(
      { found: false, error: err instanceof Error ? err.message : String(err) },
      { status: 200 }
    );
  }
}
