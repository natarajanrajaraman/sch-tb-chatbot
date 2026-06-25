import { NextResponse } from 'next/server';
import { getSystemPrompt } from '@/lib/p3/loadDocs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Returns the canonical (default) system prompt — the contents of
// docs/p3-system-prompt.md as deployed. Used by P3SystemPromptEditor
// in the debug panel to seed the textarea + power the "Revert to
// default" affordance.
export async function GET() {
  try {
    const text = getSystemPrompt();
    return NextResponse.json(
      { prompt: text },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    return NextResponse.json(
      { prompt: '', error: err instanceof Error ? err.message : String(err) },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
