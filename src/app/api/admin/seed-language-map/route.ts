import { NextResponse } from 'next/server';
import { seedLanguageMap } from '@/lib/googleSheets';
import { BOT_MESSAGES } from '@/data/messages';
import { SYMPTOM_QUESTIONS, RISK_FACTOR_QUESTIONS, RESPONSE_OPTIONS } from '@/data/questions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function buildSeed(): { key: string; en: string; mm: string; notes?: string }[] {
  const out: { key: string; en: string; mm: string; notes?: string }[] = [];

  // BOT_MESSAGES — flat msg.<key>
  for (const [k, v] of Object.entries(BOT_MESSAGES)) {
    const entry = v as { en: string; mm: string };
    out.push({ key: `msg.${k}`, en: entry.en, mm: entry.mm });
  }

  // RESPONSE_OPTIONS — opt.<group>.<key>
  for (const [group, opts] of Object.entries(RESPONSE_OPTIONS)) {
    for (const [k, v] of Object.entries(opts as Record<string, { en: string; mm: string }>)) {
      out.push({ key: `opt.${group}.${k}`, en: v.en, mm: v.mm });
    }
  }

  // SYMPTOM + RISK_FACTOR questions — question.<id>.text and .explanation
  for (const q of [...SYMPTOM_QUESTIONS, ...RISK_FACTOR_QUESTIONS]) {
    const tag = q.category === 'symptom' ? `S${q.index}` : `RF${q.index}`;
    out.push({
      key: `question.${q.id}.text`,
      en: q.textEn,
      mm: q.textMm,
      notes: `${tag} — ${q.category}`,
    });
    out.push({
      key: `question.${q.id}.explanation`,
      en: q.explanationEn,
      mm: q.explanationMm,
      notes: `${tag} explanation (shown when user taps "What does this mean?")`,
    });
  }

  return out;
}

export async function GET() {
  return handle();
}

export async function POST() {
  return handle();
}

async function handle() {
  try {
    const seed = buildSeed();
    const result = await seedLanguageMap(seed);
    return NextResponse.json({
      ok: true,
      ...result,
      totalCandidates: seed.length,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
