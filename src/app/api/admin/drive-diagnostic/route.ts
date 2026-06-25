import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { getAuth } from '@/lib/googleSheets';
import { parseDriveFolderId } from '@/lib/driveTranscript';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Diagnostic endpoint to figure out why transcripts aren't landing.
// Surfaces:
//   - is GOOGLE_DRIVE_TRANSCRIPT_FOLDER_ID set?
//   - what the SA email is
//   - can the SA see the folder at all?
//   - if so, what kind of folder is it (Shared Drive vs My Drive),
//     and what permissions does the SA have on it?
//   - can the SA actually write a tiny test file there?

interface Step {
  step: string;
  ok: boolean;
  detail?: string;
  data?: unknown;
}

export async function GET() {
  const steps: Step[] = [];

  // Step 1 — env vars
  const rawFolder = process.env.GOOGLE_DRIVE_TRANSCRIPT_FOLDER_ID;
  if (!rawFolder) {
    steps.push({
      step: 'env',
      ok: false,
      detail: 'GOOGLE_DRIVE_TRANSCRIPT_FOLDER_ID is not set on this environment. Set it on Vercel + redeploy.',
    });
    return NextResponse.json({ ok: false, steps }, { status: 200 });
  }
  // Tolerate both a bare folder ID and the full Drive URL (we parse it).
  const folderId = parseDriveFolderId(rawFolder);
  steps.push({
    step: 'env',
    ok: true,
    data: {
      raw: rawFolder,
      parsedFolderId: folderId,
      note: rawFolder !== folderId ? 'Parsed folder ID from the Drive URL you set.' : undefined,
    },
  });

  // Step 2 — service account email
  let saEmail = '';
  try {
    const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '';
    const parsed = JSON.parse(keyJson);
    saEmail = parsed?.client_email || '';
    steps.push({ step: 'sa-email', ok: !!saEmail, data: { client_email: saEmail } });
  } catch (e) {
    steps.push({ step: 'sa-email', ok: false, detail: `Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY: ${e instanceof Error ? e.message : String(e)}` });
    return NextResponse.json({ ok: false, steps }, { status: 200 });
  }

  // Step 3 — try to GET the folder metadata. This fails fast if the SA
  // doesn't have access to the folder at all.
  const drive = google.drive({ version: 'v3', auth: getAuth() });
  let folderName = '';
  let driveId: string | null = null;
  try {
    const meta = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType, driveId, parents, capabilities',
      supportsAllDrives: true,
    });
    folderName = meta.data.name || '';
    driveId = meta.data.driveId || null;
    steps.push({
      step: 'folder-get',
      ok: true,
      data: {
        name: folderName,
        mimeType: meta.data.mimeType,
        driveId,
        parents: meta.data.parents,
        capabilities: meta.data.capabilities,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const hint = msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('404')
      ? 'The folder ID is wrong OR the service account does not have any access to this folder. ' +
        `Double-check: (1) the folder ID is correct, (2) the SA email (${saEmail}) is a member of the Shared Drive (Content Manager) OR the folder is shared with the SA directly with Editor access.`
      : 'Drive API call failed.';
    steps.push({ step: 'folder-get', ok: false, detail: `${msg}\n\nHint: ${hint}` });
    return NextResponse.json({ ok: false, steps }, { status: 200 });
  }

  // Step 4 — list files in the folder (proves we can read its contents)
  try {
    const list = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, createdTime)',
      pageSize: 10,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    steps.push({
      step: 'folder-list',
      ok: true,
      data: {
        count: list.data.files?.length || 0,
        sampleFiles: (list.data.files || []).slice(0, 5).map(f => ({ id: f.id, name: f.name, createdTime: f.createdTime })),
      },
    });
  } catch (e) {
    steps.push({ step: 'folder-list', ok: false, detail: e instanceof Error ? e.message : String(e) });
  }

  // Step 5 — try to WRITE a test file. This is the real proof.
  try {
    const testName = `diagnostic-${Date.now()}.md`;
    const body = `# Drive diagnostic\n\nWritten by the SCH TB Chatbot service account at ${new Date().toISOString()}.\n\nIf you can see this file, write access works. You can delete it.\n`;
    const createResp = await drive.files.create({
      requestBody: {
        name: testName,
        parents: [folderId],
        mimeType: 'text/markdown',
        description: 'Diagnostic write test from /api/admin/drive-diagnostic',
      },
      media: {
        mimeType: 'text/markdown',
        body: Readable.from([body]),
      },
      fields: 'id, name, webViewLink',
      supportsAllDrives: true,
    });
    steps.push({
      step: 'folder-write',
      ok: true,
      data: {
        fileId: createResp.data.id,
        name: createResp.data.name,
        webViewLink: createResp.data.webViewLink,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const lower = msg.toLowerCase();
    let hint = '';
    if (lower.includes('storage') && lower.includes('quota')) {
      hint = 'Storage quota error. On a Shared Drive this usually means the SA is not a member of the Shared Drive — add it as Content Manager on the Shared Drive itself, not just the folder.';
    } else if (lower.includes('forbidden') || lower.includes('permission')) {
      hint = `The SA (${saEmail}) does not have write permission on this folder. On a Shared Drive: add the SA as a Content Manager (or higher) on the Shared Drive itself. On My Drive: share the folder with Editor access.`;
    } else if (lower.includes('not found') || lower.includes('404')) {
      hint = 'Lost access between read and write — possibly an org policy prevents external sharing on this Shared Drive.';
    } else {
      hint = 'Check the Drive API error string above.';
    }
    steps.push({ step: 'folder-write', ok: false, detail: `${msg}\n\nHint: ${hint}` });
  }

  const ok = steps.every(s => s.ok);
  return NextResponse.json({ ok, folderName, driveId, steps }, { status: 200 });
}
