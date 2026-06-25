import { NextRequest, NextResponse } from 'next/server';
import { saveTranscript } from '@/lib/driveTranscript';
import { renderTranscriptMarkdown, TranscriptMeta, TranscriptMessage } from '@/lib/transcriptFormat';
import { callOpenRouter } from '@/lib/p3/openrouter';

// Use the cheapest model for the summary — it's a single short call per
// save, the cost should stay negligible per conversation.
const SUMMARIZER_MODEL = 'deepseek/deepseek-v4-flash';

async function summarizeP3Conversation(messages: TranscriptMessage[]): Promise<string> {
  // Build a compact conversation transcript for the LLM. Use English where
  // available so the summary is readable to clinicians and reviewers; fall
  // back to Burmese when needed.
  const lines = messages.map(m => {
    const who = m.role === 'user' ? 'User' : m.role === 'bot' ? 'Bot' : 'System';
    const text = (m.textEn || m.textMm || '').replace(/\s+/g, ' ').trim();
    return `${who}: ${text}`;
  });
  if (lines.length === 0) return '';

  const systemPrompt =
    'You are summarising a TB patient counselling conversation for a clinical reviewer. ' +
    'Produce a single English paragraph of AT MOST 50 WORDS covering: who the user is, what they ' +
    'asked, what the bot advised, and any escalation. Be precise, neutral, and clinical. ' +
    'No medical advice. No emojis. No preamble. Just the paragraph.';

  const result = await callOpenRouter(SUMMARIZER_MODEL, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Conversation transcript:\n\n' + lines.join('\n') },
  ]);
  return (result.text || '').trim();
}

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
    // For P3 (LLM) conversations, generate a max-50-word summary and append
    // it to the transcript. Failures don't block the save — we still write
    // the transcript and just omit the summary footer.
    let summary = '';
    if (body.meta.mode === 'P3' && body.messages.length >= 2) {
      try {
        summary = await summarizeP3Conversation(body.messages);
      } catch (err) {
        console.error('Transcript summary failed:', err);
      }
    }

    const markdown = renderTranscriptMarkdown(body.meta, body.messages, summary);
    const result = await saveTranscript(body.meta.conversationId, markdown);
    return NextResponse.json({
      success: true,
      webViewLink: result.webViewLink,
      fileId: result.fileId,
      created: result.created,
      summary,
    });
  } catch (err) {
    console.error('Transcript save failed:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
