import { NextRequest, NextResponse } from 'next/server';
import { saveTranscript } from '@/lib/driveTranscript';
import { renderTranscriptMarkdown, TranscriptMeta, TranscriptMessage } from '@/lib/transcriptFormat';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface SaveRequestBody {
  meta: TranscriptMeta;
  messages: TranscriptMessage[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SaveRequestBody;
    if (!body?.meta?.conversationId) {
      return NextResponse.json({ success: false, error: 'meta.conversationId required' }, { status: 400 });
    }
    if (!Array.isArray(body?.messages)) {
      return NextResponse.json({ success: false, error: 'messages must be an array' }, { status: 400 });
    }
    const markdown = renderTranscriptMarkdown(body.meta, body.messages);
    const result = await saveTranscript(body.meta.conversationId, markdown);
    return NextResponse.json({
      success: true,
      webViewLink: result.webViewLink,
      fileId: result.fileId,
      created: result.created,
    });
  } catch (err) {
    console.error('Transcript save failed:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
