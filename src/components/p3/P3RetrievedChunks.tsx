'use client';

// v1.9.1 — Dev-panel widget rendering the last-turn RAG retrieval so
// testers can see what the LLM was grounded on without opening the
// Network tab. Reads what P3ChatPanel bubbles up via onRetrievedChange.

import { useState } from 'react';
import { P3RetrievedChunkInfo } from './P3ChatPanel';

interface Props {
  chunks: P3RetrievedChunkInfo[];
}

function similarityColor(sim: number): string {
  if (sim >= 0.7) return 'bg-emerald-500';
  if (sim >= 0.55) return 'bg-lime-500';
  if (sim >= 0.4) return 'bg-amber-500';
  return 'bg-slate-500';
}

export default function P3RetrievedChunks({ chunks }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="px-3 py-2 bg-gray-800/40 space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">
          Last-turn retrieval
        </span>
        <span className="text-[9px] text-gray-400">
          {chunks.length === 0 ? 'no chunks' : `${chunks.length} chunk${chunks.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {chunks.length === 0 ? (
        <div className="text-[10px] text-gray-500 italic leading-relaxed">
          No RAG chunks returned this turn — either the KB table is empty (run
          <code className="bg-gray-700/40 px-1 rounded mx-0.5 text-[9px]">node scripts/ingest-kb.js</code>
          locally), Supabase env vars aren&rsquo;t set, or no chunk cleared the
          similarity threshold (0.35). The chat is falling back to the
          system-prompt fundamentals for this turn.
        </div>
      ) : (
        <div className="space-y-1">
          {chunks.map(c => {
            const isOpen = expanded === c.tag;
            const pct = Math.round(c.similarity * 100);
            return (
              <div key={c.tag} className="border border-gray-700/40 rounded bg-gray-800/60 overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : c.tag)}
                  className="w-full text-left px-2 py-1 flex items-center gap-2 hover:bg-gray-700/40"
                >
                  <span className="text-[9px] font-mono font-semibold text-blue-300 shrink-0">[{c.tag}]</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-gray-200 truncate" title={c.sourceTitle}>
                      {c.sourceTitle}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="w-10 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${similarityColor(c.similarity)}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-gray-400 font-mono tabular-nums w-8 text-right">{pct}%</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-2 py-1.5 border-t border-gray-700/40 bg-gray-900/50 space-y-1">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider">
                      Chunk preview (first 220 chars)
                    </div>
                    <div className="text-[10px] text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {c.preview}
                      {c.preview.length >= 220 && '…'}
                    </div>
                    {c.sourceUrl && (
                      <a
                        href={c.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] text-blue-300 hover:text-blue-200 underline"
                      >
                        Open source ↗
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
