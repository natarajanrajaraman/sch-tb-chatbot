#!/usr/bin/env node
/**
 * v1.9.0 — One-shot KB ingestion into Supabase pgvector.
 *
 * Downloads each source PDF via `gog drive download` (uses Raj's
 * personal Google OAuth on `raj@equity.tech` — has access to the
 * SCH-provided shared-drive folder), extracts text, chunks, embeds
 * with OpenAI `text-embedding-3-small`, and inserts rows into the
 * `kb_chunks` table.
 *
 * Sources: the six PDFs KZ signed off on in `sch-fc-sds-tb-folder-map.
 * json → referenceLibrary.pdfs` (see docs/SRS.md §7 Data model).
 *
 * Idempotent per source: existing rows for a given source_id are
 * deleted before re-insert. Safe to re-run.
 *
 * Prereqs (local):
 *   • .env.local with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + OPENAI_API_KEY
 *     (idiomatic: `npx vercel link` then `npx vercel env pull .env.local`)
 *   • `gog` CLI installed + `raj@equity.tech` authed
 *   • npm install (already done if you're reading this)
 *
 * Usage:
 *   node scripts/ingest-kb.js                    # ingest all 6 sources
 *   node scripts/ingest-kb.js --doc=who-m4-op    # ingest one
 *   node scripts/ingest-kb.js --dry-run          # download + chunk, skip embed/insert
 *   node scripts/ingest-kb.js --force            # re-download PDFs even if cached
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const pdfParse = require('pdf-parse');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai').default || require('openai');

const SOURCES = [
  {
    slug: 'who-m4-op',
    driveId: '19PivzmxWA8FhSWS5hHO_ozRFMXp7MV3m',
    title: 'WHO Operational Handbook on TB — Module 4: Treatment and Care (2025 unified edition)',
    url: 'https://www.who.int/publications/i/item/9789240108141',
    priority: 1,
    note: 'Primary KB anchor for P3 (adherence + side-effects + counselling; Ch3 §4).',
  },
  {
    slug: 'who-m4-consolidated',
    driveId: '1QNfCrY6ft0iAcKmJLqtKA1vPafMvffkh',
    title: 'WHO Consolidated Guidelines on TB — Module 4: Treatment and Care (2025)',
    url: 'https://www.who.int/publications/i/item/9789240107243',
    priority: 2,
    note: 'Recommendations companion to WHO Op Handbook M4.',
  },
  {
    slug: 'myanmar-drtb-v523',
    driveId: '1M8bslcE02lueAeeqYat1Dr6Jm4dmPHCz',
    title: 'Myanmar NTP — DR-TB National Guidelines DRAFT v5.2.3 (Mar 2025)',
    url: 'https://ntpmyanmar.org/wp-content/uploads/2025/05/DR-TB-updated-national-guidelines-DRAFT-V-5.2.3_Mar-2025.pdf',
    priority: 3,
    note: 'Local DR-TB regimens + monitoring context.',
  },
  {
    slug: 'cdc-qa',
    driveId: '1uXUFqxA9MDAzv7Fk8O7qP5KpG9cTO16I',
    title: 'CDC — Questions and Answers About Tuberculosis',
    url: 'https://www.cdc.gov/tb/media/Question_Answers_About_TB_English.pdf',
    priority: 4,
    note: 'FAQ patterns.',
  },
  {
    slug: 'who-m2-screening',
    driveId: '1RBoKHKOK8vTn7YqbwUPX-5NilJqj0oqP',
    title: 'WHO Operational Handbook on TB — Module 2: Screening',
    url: 'https://www.who.int/publications/i/item/9789240022614',
    priority: 5,
    note: 'Primarily P1-relevant but included for cross-referencing.',
  },
  {
    slug: 'who-m1-prevention',
    driveId: '1KQsyzho9pLdPEZJ9oELbNaMac6HjpSSe',
    title: 'WHO Consolidated Guidelines on TB — Module 1: Prevention (TPT)',
    url: 'https://www.who.int/publications/i/item/9789240096196',
    priority: 6,
    note: 'Prevention context.',
  },
];

// ~1000 tokens ≈ 4000 chars for English; overlap ≈ 200 tokens ≈ 800 chars.
const CHUNK_SIZE = 4000;
const CHUNK_OVERLAP = 800;
const MIN_CHUNK_CHARS = 200;
const EMBED_BATCH = 20;

function args() {
  const out = { doc: null, dryRun: false, force: false };
  for (const a of process.argv.slice(2)) {
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--force') out.force = true;
    else if (a.startsWith('--doc=')) out.doc = a.slice('--doc='.length);
  }
  return out;
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`ERROR: ${name} is not set. Run \`npx vercel env pull .env.local\` first.`);
    process.exit(1);
  }
  return v;
}

function chunkText(text) {
  const cleaned = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  const chunks = [];
  let start = 0;
  let idx = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length);
    let slice = cleaned.slice(start, end);
    if (end < cleaned.length) {
      // Prefer paragraph or sentence boundary in the second half of the slice
      const halfway = Math.floor(slice.length * 0.5);
      const lastPara = slice.lastIndexOf('\n\n');
      const lastSent = slice.lastIndexOf('. ');
      let cut = slice.length;
      if (lastPara > halfway) cut = lastPara + 2;
      else if (lastSent > halfway) cut = lastSent + 2;
      slice = slice.slice(0, cut);
    }
    const trimmed = slice.trim();
    if (trimmed.length >= MIN_CHUNK_CHARS) {
      chunks.push({ index: idx++, content: trimmed, charCount: trimmed.length });
    }
    if (slice.length <= CHUNK_OVERLAP) break; // safety
    start += slice.length - CHUNK_OVERLAP;
  }
  return chunks;
}

async function downloadPdf(source, tmpDir, force) {
  const pdfPath = path.join(tmpDir, `${source.slug}.pdf`);
  if (fs.existsSync(pdfPath) && !force) {
    console.log(`  cached: ${pdfPath} (${(fs.statSync(pdfPath).size / 1024 / 1024).toFixed(1)} MB)`);
    return pdfPath;
  }
  console.log(`  downloading from Drive (id: ${source.driveId})...`);
  const r = spawnSync('gog', ['drive', 'download', source.driveId, '--out', pdfPath, '-a', 'raj@equity.tech', '--no-input'], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  if (r.status !== 0) {
    throw new Error(`gog drive download failed (exit ${r.status})`);
  }
  return pdfPath;
}

async function main() {
  const opts = args();
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const supabaseKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const openaiKey = requireEnv('OPENAI_API_KEY');

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const openai = new OpenAI({ apiKey: openaiKey });

  const tmpDir = path.join(os.tmpdir(), 'sch-tb-chatbot-kb');
  fs.mkdirSync(tmpDir, { recursive: true });

  const sources = opts.doc ? SOURCES.filter(s => s.slug === opts.doc) : SOURCES;
  if (sources.length === 0) {
    console.error(`No source matches --doc=${opts.doc}. Available slugs:`);
    SOURCES.forEach(s => console.error(`  ${s.slug}`));
    process.exit(1);
  }

  const summary = { sources: 0, chunks: 0, embeddings: 0, tokens: 0, elapsedMs: 0, skipped: 0 };
  const t0 = Date.now();

  for (const source of sources) {
    console.log(`\n[${source.slug}] ${source.title}`);
    const pdfPath = await downloadPdf(source, tmpDir, opts.force);
    console.log('  extracting text...');
    const parsed = await pdfParse(fs.readFileSync(pdfPath));
    console.log(`  ${parsed.numpages} pages, ${parsed.text.length.toLocaleString()} chars`);

    const chunks = chunkText(parsed.text);
    console.log(`  ${chunks.length} chunks (~${Math.round(chunks.reduce((a, c) => a + c.charCount, 0) / chunks.length)} chars avg)`);
    summary.chunks += chunks.length;

    if (opts.dryRun) {
      console.log('  --dry-run: skipping embed + insert');
      summary.skipped += chunks.length;
      continue;
    }

    console.log('  deleting existing rows for this source_id...');
    const { error: delErr } = await supabase.from('kb_chunks').delete().eq('source_id', source.driveId);
    if (delErr) throw delErr;

    console.log(`  embedding + inserting in batches of ${EMBED_BATCH}...`);
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batch = chunks.slice(i, i + EMBED_BATCH);
      const emb = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch.map(c => c.content),
      });
      summary.tokens += emb.usage?.total_tokens || 0;
      summary.embeddings += batch.length;
      const rows = batch.map((c, j) => ({
        source_id: source.driveId,
        source_title: source.title,
        source_url: source.url,
        page_number: null,
        section: null,
        content: c.content,
        embedding: emb.data[j].embedding,
        metadata: {
          slug: source.slug,
          chunk_index: c.index,
          char_count: c.charCount,
          priority: source.priority,
          note: source.note,
        },
      }));
      const { error: insErr } = await supabase.from('kb_chunks').insert(rows);
      if (insErr) throw insErr;
      process.stdout.write(`    inserted ${Math.min(i + EMBED_BATCH, chunks.length)}/${chunks.length}\r`);
    }
    console.log('');
    summary.sources += 1;
    console.log(`  ✓ ${source.slug} done`);
  }

  summary.elapsedMs = Date.now() - t0;

  console.log('\n─────────────────────────────────────');
  console.log(' Summary');
  console.log('─────────────────────────────────────');
  console.log(` Sources ingested: ${summary.sources} / ${sources.length}`);
  console.log(` Chunks (total):   ${summary.chunks}`);
  console.log(` Embeddings:       ${summary.embeddings}`);
  console.log(` Embed tokens:     ${summary.tokens.toLocaleString()}`);
  const cost = (summary.tokens / 1_000_000) * 0.02;
  console.log(` Approx cost:      $${cost.toFixed(4)}  (text-embedding-3-small = $0.02/1M input tokens)`);
  console.log(` Elapsed:          ${(summary.elapsedMs / 1000).toFixed(1)}s`);
  if (opts.dryRun) console.log(' (dry-run — nothing was written to Supabase)');
  console.log('');

  if (!opts.dryRun && summary.sources > 0) {
    const { count, error } = await supabase.from('kb_chunks').select('*', { count: 'exact', head: true });
    if (!error) console.log(` Total kb_chunks rows in Supabase now: ${count}`);
  }
}

main().catch(err => {
  console.error('\nFAIL:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
