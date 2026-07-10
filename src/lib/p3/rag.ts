import OpenAI from 'openai';
import { getSupabase } from '@/lib/supabase';

// v1.9.0 — Retrieval-Augmented Generation helper for P3.
//
// Given the user's message + a short slice of prior conversation,
// embed the query, run cosine similarity against the `kb_chunks` table
// via the `match_kb_chunks` RPC, and return the top-k chunks with
// source citations.
//
// Failure mode: any error (missing env vars, empty table, OpenAI
// hiccup, Supabase timeout) returns an empty array. The chat route
// then falls back to the inline system-prompt summary, so the bot
// never breaks because RAG is unavailable.

export interface RetrievedChunk {
  id: number;
  content: string;
  sourceId: string;
  sourceTitle: string;
  sourceUrl: string | null;
  pageNumber: number | null;
  section: string | null;
  similarity: number;
}

const EMBED_MODEL = 'text-embedding-3-small';
const EMBED_DIMS = 1536;

interface MatchRow {
  id: number;
  source_id: string;
  source_title: string;
  source_url: string | null;
  page_number: number | null;
  section: string | null;
  content: string;
  similarity: number;
}

let _openai: OpenAI | null | undefined;
function getOpenAI(): OpenAI | null {
  if (_openai !== undefined) return _openai;
  const key = process.env.OPENAI_API_KEY;
  _openai = key ? new OpenAI({ apiKey: key }) : null;
  return _openai;
}

/**
 * Retrieve top-k relevant chunks from the KB. Never throws.
 */
export async function retrieveKbChunks(
  userMessage: string,
  opts: { topK?: number; minSimilarity?: number; recentTurns?: string[] } = {}
): Promise<RetrievedChunk[]> {
  const supabase = getSupabase();
  const openai = getOpenAI();
  if (!supabase || !openai) return [];

  const topK = opts.topK ?? 6;
  const minSimilarity = opts.minSimilarity ?? 0.35;

  // Build the query text — user message + optional recent conversation
  // context so multi-turn refinements ("what about pediatric doses?")
  // still recall the parent topic.
  const query = [
    ...(opts.recentTurns || []).slice(-2),
    userMessage,
  ].join('\n\n').slice(0, 4000);

  try {
    const emb = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: query,
    });
    const vec = emb.data[0]?.embedding;
    if (!vec || vec.length !== EMBED_DIMS) return [];

    const { data, error } = await supabase.rpc('match_kb_chunks', {
      query_embedding: vec,
      match_count: topK,
      min_similarity: minSimilarity,
    });
    if (error) {
      console.error('[rag] match_kb_chunks RPC error:', error);
      return [];
    }
    return (data || []).map((r: MatchRow) => ({
      id: r.id,
      content: r.content,
      sourceId: r.source_id,
      sourceTitle: r.source_title,
      sourceUrl: r.source_url,
      pageNumber: r.page_number,
      section: r.section,
      similarity: r.similarity,
    }));
  } catch (err) {
    console.error('[rag] retrieve failed:', err);
    return [];
  }
}

/**
 * Format retrieved chunks as a compact context block to splice into
 * the system prompt. Each chunk carries a `[S1]`, `[S2]`, … tag the
 * LLM can echo when citing.
 */
export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return '';
  const lines: string[] = [
    'RETRIEVED KNOWLEDGE BASE CHUNKS (cite these with [S1], [S2], … when your reply draws on them):',
    '',
  ];
  chunks.forEach((c, i) => {
    const tag = `[S${i + 1}]`;
    const cite = c.pageNumber ? `${c.sourceTitle} (p. ${c.pageNumber})` : c.sourceTitle;
    lines.push(`${tag} ${cite}`);
    lines.push(c.content);
    lines.push('');
  });
  lines.push('END OF RETRIEVED CHUNKS.');
  return lines.join('\n');
}
