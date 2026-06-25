import { google } from 'googleapis';
import { Readable } from 'stream';
import { getAuth } from './googleSheets';

// v1.0.0 — write conversation transcripts as Markdown files to a Drive
// folder shared with the service account. One file per conversationId.

function getDrive() {
  return google.drive({ version: 'v3', auth: getAuth() });
}

function getFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_TRANSCRIPT_FOLDER_ID;
  if (!id) {
    throw new Error(
      'GOOGLE_DRIVE_TRANSCRIPT_FOLDER_ID env var is not set. Set it to the ID of the Drive folder you shared with the service account.'
    );
  }
  return id;
}

export interface TranscriptSaveResult {
  fileId: string;
  webViewLink: string;
  created: boolean;
}

// Find an existing file named `${conversationId}.md` in the configured
// folder. Returns { fileId, webViewLink } or null.
async function findTranscript(conversationId: string): Promise<{ fileId: string; webViewLink: string } | null> {
  const drive = getDrive();
  const folderId = getFolderId();
  // q is sensitive to single quotes in the name — conversation IDs are
  // alphanumeric + hyphen / underscore so we're safe, but escape anyway.
  const safeName = `${conversationId}.md`.replace(/'/g, "\\'");
  const resp = await drive.files.list({
    q: `name = '${safeName}' and '${folderId}' in parents and trashed = false`,
    fields: 'files(id, webViewLink)',
    spaces: 'drive',
    pageSize: 1,
  });
  const file = resp.data.files?.[0];
  if (!file?.id) return null;
  return { fileId: file.id, webViewLink: file.webViewLink || '' };
}

// Saves the Markdown content to Drive: creates the file on first call,
// updates content on subsequent calls. Returns the file id + webViewLink.
export async function saveTranscript(conversationId: string, markdown: string): Promise<TranscriptSaveResult> {
  const drive = getDrive();
  const folderId = getFolderId();
  const name = `${conversationId}.md`;
  const existing = await findTranscript(conversationId);

  // googleapis expects a stream or Buffer for media.body
  const bodyStream = Readable.from([markdown]);

  if (existing) {
    await drive.files.update({
      fileId: existing.fileId,
      media: {
        mimeType: 'text/markdown',
        body: bodyStream,
      },
    });
    // webViewLink doesn't change on content update, so we can return what
    // we already had — but re-fetch in case the list call returned an empty
    // string (Drive sometimes omits webViewLink without explicit fields).
    let link = existing.webViewLink;
    if (!link) {
      const meta = await drive.files.get({ fileId: existing.fileId, fields: 'webViewLink' });
      link = meta.data.webViewLink || `https://drive.google.com/file/d/${existing.fileId}/view`;
    }
    return { fileId: existing.fileId, webViewLink: link, created: false };
  }

  // Create
  const createResp = await drive.files.create({
    requestBody: {
      name,
      parents: [folderId],
      mimeType: 'text/markdown',
      description: `SCH TB Chatbot transcript for conversation ${conversationId}`,
    },
    media: {
      mimeType: 'text/markdown',
      body: bodyStream,
    },
    fields: 'id, webViewLink',
  });
  const fileId = createResp.data.id || '';
  const webViewLink = createResp.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
  return { fileId, webViewLink, created: true };
}
