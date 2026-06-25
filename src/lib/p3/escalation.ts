// Escalation parsing + rule-based pre-check.
//
// The LLM is asked to prefix every reply with a single line:
//   <escalation level="none|nonurgent|telehealth|immediate"/>
//
// We strip that line from the user-visible reply and use it to drive
// the chat-side UX (referral letter, careReferralId, etc).
//
// Belt-and-braces: a small regex layer also runs over the user's
// LATEST message before the LLM call, and the FINAL level used is
// the max of (LLM-emitted, rule-based). The Medibot WHO chapter's
// "hallucination guardrails are architecture, not polish" principle.

export type EscalationLevel = 'none' | 'nonurgent' | 'telehealth' | 'immediate';

const LEVEL_ORDER: EscalationLevel[] = ['none', 'nonurgent', 'telehealth', 'immediate'];

function levelRank(l: EscalationLevel): number {
  const i = LEVEL_ORDER.indexOf(l);
  return i < 0 ? 0 : i;
}

export function maxLevel(a: EscalationLevel, b: EscalationLevel): EscalationLevel {
  return levelRank(a) >= levelRank(b) ? a : b;
}

// Strips the leading <escalation level="..."/> tag from the LLM
// reply and returns both the level and the clean reply text. Falls
// back to 'none' if the tag is missing or malformed.
export function parseEscalationTag(rawReply: string): { level: EscalationLevel; cleanReply: string } {
  const tagMatch = rawReply.match(/^\s*<escalation\s+level="(none|nonurgent|telehealth|immediate)"\s*\/?\s*>\s*\n?/i);
  if (!tagMatch) {
    return { level: 'none', cleanReply: rawReply.trim() };
  }
  const level = tagMatch[1].toLowerCase() as EscalationLevel;
  const cleanReply = rawReply.slice(tagMatch[0].length).trim();
  return { level, cleanReply };
}

// Rule-based pre-check on the user's message. Returns the highest
// severity level any rule matches, default 'none'.
// English patterns only in v0.9 — Burmese phrases TODO Wa Thone
// review per docs/p3-escalation-rules.md.

interface Rule {
  level: EscalationLevel;
  patterns: RegExp[];
  label: string;
}

const RULES: Rule[] = [
  {
    level: 'immediate',
    label: 'haemoptysis',
    patterns: [/\b(cough\w*\s+(up\s+)?blood|blood\s+in\s+(my\s+)?(sputum|cough|phlegm)|haemoptysis|hemoptysis)\b/i],
  },
  {
    level: 'immediate',
    label: 'severe breathing',
    patterns: [/\b(can'?t\s+breathe|severe\s+breath|struggling\s+to\s+breathe|gasping|shortness\s+of\s+breath\s+(severe|very|extreme))\b/i],
  },
  {
    level: 'immediate',
    label: 'chest pain',
    patterns: [/\b(chest\s+pain|severe\s+chest\s+pain|pain\s+in\s+(my\s+)?chest)\b/i],
  },
  {
    level: 'immediate',
    label: 'altered consciousness',
    patterns: [/\b(fainted|confused|altered\s+consciousness|can'?t\s+think\s+clearly|passed\s+out)\b/i],
  },
  {
    level: 'immediate',
    label: 'severe weakness',
    patterns: [/\b(too\s+weak\s+to\s+(stand|walk)|can'?t\s+get\s+out\s+of\s+bed|extreme\s+weakness)\b/i],
  },
  {
    level: 'immediate',
    label: 'self-harm signal',
    patterns: [/\b(want\s+to\s+(hurt|kill)\s+myself|end\s+my\s+life|suicide|don'?t\s+want\s+to\s+live)\b/i],
  },
  {
    level: 'immediate',
    label: 'abuse signal',
    patterns: [/\b(someone\s+is\s+hurting\s+me|being\s+abused|domestic\s+violence)\b/i],
  },
  {
    level: 'immediate',
    label: 'jaundice',
    patterns: [/\b(yellow\s+(eyes|skin)|jaundice)\b/i],
  },
  {
    level: 'immediate',
    label: 'severe vomiting',
    patterns: [/\b(vomiting\s+everything|can'?t\s+keep\s+(medicine|food)\s+down|severe\s+vomiting)\b/i],
  },
  // telehealth-level patterns
  {
    level: 'telehealth',
    label: 'treatment interruption',
    patterns: [/\b(missed\s+(\d+|several|multiple|many)\s+doses?|haven'?t\s+taken\s+(my\s+)?(meds|medicine)|stopped\s+taking)\b/i],
  },
  {
    level: 'telehealth',
    label: 'hearing change',
    patterns: [/\b(hearing\s+(loss|change|getting\s+worse)|ringing\s+in\s+ears|tinnitus)\b/i],
  },
  {
    level: 'telehealth',
    label: 'vision change',
    patterns: [/\b(vision\s+(change|blurry|getting\s+worse)|blurred\s+vision|hard\s+to\s+see)\b/i],
  },
  {
    level: 'telehealth',
    label: 'mood change',
    patterns: [/\b(very\s+sad|depressed|hopeless|mood\s+(change|swing))\b/i],
  },
  {
    level: 'telehealth',
    label: 'neuropathy',
    patterns: [/\b(numbness|tingling)\s+in\s+(my\s+)?(hands|feet|fingers|toes)\b/i],
  },
  {
    level: 'telehealth',
    label: 'palpitations',
    patterns: [/\b(palpitations|heart\s+(racing|pounding)|skipped\s+beats|syncope)\b/i],
  },
  {
    level: 'telehealth',
    label: 'rash with severity',
    patterns: [/\b(severe\s+rash|rash\s+(spreading|all\s+over)|mouth\s+ulcers?)\b/i],
  },
  {
    level: 'telehealth',
    label: 'explicit help request',
    patterns: [/\b(i\s+need\s+(help|medical|a\s+doctor)|can\s+(someone|anyone)\s+help|want\s+to\s+(talk\s+to\s+)?a?\s*doctor)\b/i],
  },
];

export function ruleBasedPreCheck(userMessage: string): { level: EscalationLevel; matches: string[] } {
  const matches: string[] = [];
  let level: EscalationLevel = 'none';
  for (const rule of RULES) {
    if (rule.patterns.some(p => p.test(userMessage))) {
      matches.push(`${rule.level}: ${rule.label}`);
      level = maxLevel(level, rule.level);
    }
  }
  return { level, matches };
}
