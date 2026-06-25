'use client';

import { useState, useEffect } from 'react';

interface P3SystemPromptEditorProps {
  override: string | null;
  onOverrideChange: (text: string | null) => void;
}

// Collapsible editor that lets testers hot-edit the P3 system prompt
// in the debug panel without redeploying. The default is loaded from
// /api/p3/system-prompt (which reads docs/p3-system-prompt.md
// server-side). "Revert to default" clears the override.

export default function P3SystemPromptEditor({ override, onOverrideChange }: P3SystemPromptEditorProps) {
  const [open, setOpen] = useState(false);
  const [defaultPrompt, setDefaultPrompt] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<string>('');
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/p3/system-prompt', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled) {
          setDefaultPrompt(data?.prompt || '');
          // Seed the draft with the current effective prompt
          if (!override) {
            setDraft(data?.prompt || '');
          }
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [override]);

  // When override changes externally (e.g. revert), refresh the draft
  useEffect(() => {
    if (override == null) {
      setDraft(defaultPrompt);
      setDirty(false);
    } else {
      setDraft(override);
      setDirty(false);
    }
  }, [override, defaultPrompt]);

  const handleApply = () => {
    if (!draft.trim()) {
      setError('System prompt cannot be empty');
      return;
    }
    onOverrideChange(draft);
    setDirty(false);
    setError(null);
  };

  const handleRevert = () => {
    onOverrideChange(null);
    setDraft(defaultPrompt);
    setDirty(false);
    setError(null);
  };

  const isOverridden = override != null;

  return (
    <div className="border-b border-gray-700/30 bg-gray-800/40 shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full px-3 py-1.5 text-[10px] font-medium tracking-wider uppercase text-left transition-colors flex items-center justify-between ${
          open
            ? 'bg-purple-900/30 text-purple-300'
            : 'bg-gray-800/40 text-gray-500 hover:text-gray-300 hover:bg-gray-800/60'
        }`}
      >
        <span>
          {open ? '▾' : '▸'} P3 System Prompt
          {isOverridden && <span className="ml-2 text-[9px] text-amber-300/80 bg-amber-500/10 px-1 rounded">overridden</span>}
        </span>
      </button>

      {open && (
        <div className="px-3 py-2 space-y-1.5">
          {loading ? (
            <div className="text-[10px] text-gray-500">Loading default prompt…</div>
          ) : (
            <>
              <textarea
                value={draft}
                onChange={e => {
                  setDraft(e.target.value);
                  setDirty(true);
                  setError(null);
                }}
                className="w-full h-48 bg-gray-900/60 text-gray-200 text-[10px] font-mono px-2 py-1.5 rounded border border-gray-700 resize-y leading-relaxed"
                spellCheck={false}
              />

              {error && (
                <div className="text-[10px] text-red-400">{error}</div>
              )}

              <div className="flex items-center justify-between gap-2">
                <div className="text-[9px] text-gray-500">
                  {dirty ? 'Unsaved changes' : isOverridden ? 'Using override' : 'Using default'}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={handleApply}
                    disabled={!dirty}
                    className="px-2 py-1 text-[10px] bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-30"
                    title="Apply this prompt to the next turn"
                  >
                    Apply
                  </button>
                  <button
                    onClick={handleRevert}
                    disabled={!isOverridden && !dirty}
                    className="px-2 py-1 text-[10px] bg-gray-600 text-gray-200 rounded hover:bg-gray-500 disabled:opacity-30"
                    title="Discard override; revert to docs/p3-system-prompt.md"
                  >
                    Revert to default
                  </button>
                </div>
              </div>

              <div className="text-[9px] text-gray-500 leading-relaxed">
                Edits affect ONLY this browser tab's session. To make a change persistent across all users,
                edit <code>docs/p3-system-prompt.md</code> in the repo and redeploy.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
