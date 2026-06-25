'use client';

import { ConversationState, SessionData } from '@/lib/chatEngine';

interface Stage {
  id: string;
  label: string;
  matches: (s: ConversationState) => boolean;
  sublabel?: (s: ConversationState) => string | null;
}

const STAGES: Stage[] = [
  {
    id: 'landing',
    label: 'Landing',
    matches: s => s === 'LANDING',
  },
  {
    id: 'age',
    label: 'Age check',
    matches: s => s === 'ASK_AGE' || s === 'AGE_UNDER_15',
  },
  {
    id: 'symptoms',
    label: 'Symptoms (8)',
    matches: s => s === 'SYMPTOM_INTRO' || (typeof s === 'string' && s.startsWith('SYMPTOM_')),
    sublabel: s => {
      if (typeof s !== 'string') return null;
      if (s === 'SYMPTOM_INTRO') return 'intro';
      if (s.startsWith('SYMPTOM_')) {
        const n = parseInt(s.replace('SYMPTOM_', ''), 10);
        return Number.isFinite(n) ? `Q${n}/8` : null;
      }
      return null;
    },
  },
  {
    id: 'risk_factors',
    label: 'Risk factors (10)',
    matches: s => s === 'RISK_FACTOR_INTRO' || (typeof s === 'string' && s.startsWith('RISK_FACTOR_')),
    sublabel: s => {
      if (typeof s !== 'string') return null;
      if (s === 'RISK_FACTOR_INTRO') return 'intro';
      if (s.startsWith('RISK_FACTOR_')) {
        const n = parseInt(s.replace('RISK_FACTOR_', ''), 10);
        return Number.isFinite(n) ? `Q${n}/10` : null;
      }
      return null;
    },
  },
  {
    id: 'demographics',
    label: 'Demographics',
    matches: s => s === 'ASK_NAME' || s === 'ASK_GENDER',
    sublabel: s => (s === 'ASK_NAME' ? 'name' : s === 'ASK_GENDER' ? 'gender' : null),
  },
  {
    id: 'result',
    label: 'Result',
    matches: s => s === 'CLASSIFICATION' || s === 'HEALTH_EDUCATION',
  },
  {
    id: 'referral',
    label: 'Referral',
    matches: s =>
      s === 'REFERRAL_CHOICE' ||
      s === 'ASSISTED_CONSENT' ||
      s === 'ASSISTED_ASK_PHONE' ||
      s === 'ASSISTED_RESULT' ||
      s === 'ASSISTED_NO_CONSENT' ||
      s === 'SELF_ASK_STATE' ||
      s === 'SELF_ASK_DISTRICT' ||
      s === 'SELF_ASK_TOWNSHIP' ||
      s === 'SELF_ASK_TOWNSHIP_FREEFORM' ||
      s === 'SELF_ASK_CONTACT' ||
      s === 'SELF_RESULT',
    sublabel: s => {
      switch (s) {
        case 'REFERRAL_CHOICE': return 'choose';
        case 'ASSISTED_CONSENT': return 'assisted · consent';
        case 'ASSISTED_ASK_PHONE': return 'assisted · phone';
        case 'ASSISTED_RESULT': return 'assisted · done';
        case 'ASSISTED_NO_CONSENT': return 'assisted · declined';
        case 'SELF_ASK_STATE': return 'self · state';
        case 'SELF_ASK_DISTRICT': return 'self · district';
        case 'SELF_ASK_TOWNSHIP': return 'self · township';
        case 'SELF_ASK_TOWNSHIP_FREEFORM': return 'self · township (typed)';
        case 'SELF_ASK_CONTACT': return 'self · contact';
        case 'SELF_RESULT': return 'self · done';
        default: return null;
      }
    },
  },
  {
    id: 'end',
    label: 'End / restart',
    matches: s =>
      s === 'END_OPTIONS' ||
      s === 'GOODBYE' ||
      s === 'OTHER_QUESTIONS' ||
      s === 'EXITED' ||
      s === 'DECLINE' ||
      s === 'P3_STUB',
    sublabel: s => (s === 'P3_STUB' ? 'P3 stub' : s === 'EXITED' ? 'exited' : null),
  },
];

export default function WorkflowFlowchart({ state, session }: { state: ConversationState; session?: SessionData }) {
  // P3 mode is its own flow — the screening state machine doesn't apply.
  const isP3 = session?.landingChoice === '2';

  // Pediatric path skips the RF stage — hide it from the flowchart so the
  // user's actual journey is shown.
  const visibleStages = session?.ageGroup === 'pediatric'
    ? STAGES.filter(s => s.id !== 'risk_factors')
    : STAGES;
  const currentIdx = visibleStages.findIndex(s => s.matches(state));

  const ageLabel = session?.ageGroup === 'pediatric'
    ? 'Pediatric pass (5-14, 2+ Yes)'
    : session?.ageGroup === 'adult'
      ? 'Adult pass (15+, 8 sym + 10 RF)'
      : session?.ageGroup === 'under_5'
        ? 'Excluded (under 5)'
        : null;

  if (isP3) {
    return (
      <div className="px-3 py-2 border-b border-gray-700/30 bg-gray-900/40 shrink-0">
        <div className="text-[9px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          Workflow position
        </div>
        <div className="flex items-center gap-2 text-[10px] text-yellow-300 font-semibold">
          <span className="w-3 inline-block text-center">●</span>
          <span>P3 — Patient info chatbot</span>
          <span className="ml-auto text-[9px] text-amber-400/80">LLM mode</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 border-b border-gray-700/30 bg-gray-900/40 shrink-0">
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="text-[9px] font-medium text-gray-500 uppercase tracking-wider">
          Workflow position
        </div>
        {ageLabel && <div className="text-[9px] text-amber-400/80">{ageLabel}</div>}
      </div>
      <div className="space-y-0.5">
        {visibleStages.map((s, i) => {
          const isCurrent = i === currentIdx;
          const isPast = currentIdx >= 0 && i < currentIdx;
          const sub = isCurrent && s.sublabel ? s.sublabel(state) : null;
          const dot = isCurrent ? '●' : isPast ? '✓' : '○';
          const color = isCurrent
            ? 'text-yellow-300 font-semibold'
            : isPast
              ? 'text-emerald-400/60'
              : 'text-gray-500';
          return (
            <div key={s.id} className={`flex items-baseline gap-1.5 text-[10px] ${color}`}>
              <span className="w-3 inline-block text-center">{dot}</span>
              <span>{s.label}</span>
              {sub && <span className="text-[9px] text-yellow-200/70 ml-auto">{sub}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
