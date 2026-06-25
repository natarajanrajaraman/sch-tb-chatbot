'use client';

import { useState } from 'react';

interface TranscriptLinkProps {
  conversationId: string;
}

// Renders a "📄 Transcript" button that opens the Drive Markdown file
// for the given conversationId in a new tab.
//
// Looks up the URL via /api/transcript/lookup on click (no preflight on
// mount, so the dashboard's initial render isn't slowed down by lookups
// for transcripts the reviewer never opens).
//
// Note: this depends on GOOGLE_DRIVE_TRANSCRIPT_FOLDER_ID being set on
// the server. If not, the click surfaces an error inline.

export default function TranscriptLink({ conversationId }: TranscriptLinkProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'missing' | 'error'>('idle');
  const [error, setError] = useState<string>('');

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!conversationId) return;
    setState('loading');
    setError('');
    try {
      const res = await fetch(`/api/transcript/lookup?conversationId=${encodeURIComponent(conversationId)}`);
      const data = await res.json();
      if (data?.found && data?.webViewLink) {
        window.open(data.webViewLink, '_blank', 'noopener,noreferrer');
        setState('idle');
        return;
      }
      if (data?.error) {
        setState('error');
        setError(String(data.error));
        return;
      }
      setState('missing');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (!conversationId) return <span className="text-gray-300">—</span>;

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded transition-colors ${
        state === 'idle' || state === 'loading'
          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
          : state === 'missing'
            ? 'bg-gray-100 text-gray-500'
            : 'bg-red-50 text-red-700'
      }`}
      title={
        state === 'missing'
          ? `No transcript file found for ${conversationId}. Older conversations (before v1.0.0) were not saved to Drive.`
          : state === 'error'
            ? `Transcript lookup failed: ${error}`
            : `Open the Markdown transcript for ${conversationId} in a new tab.`
      }
    >
      📄 {state === 'loading' ? '…' : state === 'missing' ? 'No transcript' : state === 'error' ? 'Lookup failed' : 'Transcript'}
    </button>
  );
}
