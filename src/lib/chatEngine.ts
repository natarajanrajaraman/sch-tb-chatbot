import {
  SYMPTOM_QUESTIONS,
  RISK_FACTOR_QUESTIONS,
  RESPONSE_OPTIONS,
  ScreeningQuestion,
} from '@/data/questions';
import { BOT_MESSAGES } from '@/data/messages';
import { t } from './textRegistry';
import { getStates, getDistricts, getTownships } from './locationRegistry';

export const BOT_VERSION = '1.7.2';

export type ConversationState =
  | 'LANDING'
  | 'P3_STUB'
  | 'ASK_AGE'
  | 'AGE_UNDER_5'
  | 'SYMPTOM_INTRO'
  | `SYMPTOM_${number}`
  | 'RISK_FACTOR_INTRO'
  | `RISK_FACTOR_${number}`
  | 'ASK_NAME'
  | 'ASK_GENDER'
  | 'CLASSIFICATION'
  | 'REFERRAL_CHOICE'
  | 'ASSISTED_CONSENT'
  | 'ASSISTED_NO_CONSENT'
  | 'ASSISTED_ASK_PHONE'
  | 'ASSISTED_RESULT'
  | 'SELF_ASK_STATE'
  | 'SELF_ASK_DISTRICT'
  | 'SELF_ASK_TOWNSHIP'
  | 'SELF_ASK_TOWNSHIP_FREEFORM'
  | 'SELF_ASK_CONTACT'
  | 'SELF_RESULT'
  | 'HEALTH_EDUCATION'
  | 'END_OPTIONS'
  | 'OTHER_QUESTIONS'
  | 'GOODBYE'
  | 'AGE_UNDER_15'
  | 'EXITED'
  | 'DECLINE';

export interface Message {
  id: string;
  sender: 'bot' | 'user';
  textMm: string;
  textEn: string;
  timestamp: number;
  options?: MessageOption[];
  optionType?: 'single' | 'multi';
}

export interface MessageOption {
  id: string;
  labelMm: string;
  labelEn: string;
}

export type AgeGroup = 'under_5' | 'pediatric' | 'adult';

export interface SessionData {
  conversationId: string;
  startedAt: string;
  completedAt?: string;
  platformView: string;
  landingChoice?: '1' | '2';
  clientName?: string;
  clientAge?: number;          // legacy — no longer populated, kept for schema compat
  ageGroup?: AgeGroup;          // new in v0.7
  clientGender?: string;
  symptoms: Record<string, boolean>;
  riskFactors: Record<string, boolean>;
  classification?: 'Presumptive TB' | 'Negative (High Risk)' | 'Not Presumptive TB';
  referralType?: 'Assisted' | 'Self' | 'None';
  consentToPhoneContact?: boolean;
  referralStateRegion?: string;
  referralDistrict?: string;
  referralTownship?: string;
  clientPhone?: string;
  referralSitesShown?: string[];
  status: 'in_progress' | 'completed' | 'abandoned';
  under15Excluded: boolean;     // legacy semantics: "was the user excluded for age". v0.7 = excluded when under_5.
  screeningId?: string;
  botVersion: string;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function generateScreeningId(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `SCR-${yy}${mm}${dd}-${code}`;
}

export function createInitialSession(platformView: string): SessionData {
  return {
    conversationId: generateId(),
    startedAt: new Date().toISOString(),
    platformView,
    symptoms: {},
    riskFactors: {},
    status: 'in_progress',
    under15Excluded: false,
    botVersion: BOT_VERSION,
  };
}

// ----- State helpers (for ChatWindow's screening-action interceptor) -----

export interface QuestionLocation {
  category: 'symptom' | 'risk_factor';
  index: number;
}

export function getQuestionLocationForState(state: ConversationState): QuestionLocation | null {
  if (typeof state !== 'string') return null;
  if (state.startsWith('SYMPTOM_')) {
    const n = parseInt(state.replace('SYMPTOM_', ''), 10);
    if (Number.isFinite(n) && n >= 1 && n <= SYMPTOM_QUESTIONS.length) {
      return { category: 'symptom', index: n };
    }
  }
  if (state.startsWith('RISK_FACTOR_')) {
    const n = parseInt(state.replace('RISK_FACTOR_', ''), 10);
    if (Number.isFinite(n) && n >= 1 && n <= RISK_FACTOR_QUESTIONS.length) {
      return { category: 'risk_factor', index: n };
    }
  }
  return null;
}

export function getQuestionByLocation(loc: QuestionLocation): ScreeningQuestion | null {
  const arr = loc.category === 'symptom' ? SYMPTOM_QUESTIONS : RISK_FACTOR_QUESTIONS;
  return arr[loc.index - 1] || null;
}

// Legacy export used by older callers
export function getSymptomIndexForState(state: ConversationState): number | null {
  const loc = getQuestionLocationForState(state);
  return loc?.category === 'symptom' ? loc.index : null;
}

export function getSymptomQuestionByIndex(index: number): ScreeningQuestion | null {
  return SYMPTOM_QUESTIONS[index - 1] || null;
}

export interface ActionConfig {
  explain: boolean;
  back: boolean;
  exit: boolean;
}

// Action buttons (Explain / Back / Exit) per state. Symptom and risk-factor
// states are handled by getActionConfigForState() below because they're
// parametric.
const ACTION_CONFIGS: Partial<Record<ConversationState, ActionConfig>> = {
  // ASK_AGE: no exit button — it now uses 3 age-bucket buttons; users can
  // simply pick "Under 5" to end the screening or use the debug-panel
  // Restart Conversation button.
  ASK_NAME:                   { explain: false, back: true,  exit: true  },
  ASK_GENDER:                 { explain: false, back: true,  exit: true  },
  REFERRAL_CHOICE:            { explain: true,  back: true,  exit: true  },
  ASSISTED_CONSENT:           { explain: true,  back: true,  exit: true  },
  ASSISTED_ASK_PHONE:         { explain: false, back: true,  exit: true  },
  SELF_ASK_STATE:             { explain: false, back: true,  exit: true  },
  SELF_ASK_DISTRICT:          { explain: false, back: true,  exit: true  },
  SELF_ASK_TOWNSHIP:          { explain: false, back: true,  exit: true  },
  SELF_ASK_TOWNSHIP_FREEFORM: { explain: false, back: true,  exit: true  },
  SELF_ASK_CONTACT:           { explain: false, back: true,  exit: true  },
};

export function getActionConfigForState(state: ConversationState): ActionConfig {
  if (typeof state === 'string' && (state.startsWith('SYMPTOM_') || state.startsWith('RISK_FACTOR_'))) {
    return { explain: true, back: true, exit: true };
  }
  return ACTION_CONFIGS[state] || { explain: false, back: false, exit: false };
}

export function getScreeningActionOptions(): MessageOption[] {
  return buildActionOptions({ explain: true, back: true, exit: true });
}

export function buildActionOptions(cfg: ActionConfig): MessageOption[] {
  const out: MessageOption[] = [];
  if (cfg.explain) {
    const explain = t('opt.screening_action.explain', RESPONSE_OPTIONS.screening_action.explain);
    out.push({ id: 'act_explain', labelMm: explain.mm, labelEn: explain.en });
  }
  if (cfg.back) {
    const back = t('opt.screening_action.back', RESPONSE_OPTIONS.screening_action.back);
    out.push({ id: 'act_back', labelMm: back.mm, labelEn: back.en });
  }
  if (cfg.exit) {
    const exit = t('opt.screening_action.exit', RESPONSE_OPTIONS.screening_action.exit);
    out.push({ id: 'act_exit', labelMm: exit.mm, labelEn: exit.en });
  }
  return out;
}

// Appends action buttons to a bot message based on the state the user is now
// in. Idempotent — drops any already-appended action options first.
export function withScreeningActions(msg: Message, state: ConversationState): Message {
  const cfg = getActionConfigForState(state);
  const actions = buildActionOptions(cfg);
  if (actions.length === 0) return msg;
  const stripped = (msg.options || []).filter(
    o => o.id !== 'act_explain' && o.id !== 'act_back' && o.id !== 'act_exit'
  );
  return {
    ...msg,
    options: [...stripped, ...actions],
    optionType: msg.optionType || 'single',
  };
}

// Rebuilds the message the bot should be showing while the user is in the
// given state. Used after "What does this mean?" so we can re-display the
// question, and after a Back tap when we're returning to a state that isn't
// a symptom/RF question. Returns null when there's no canonical message for
// the state (terminal states, free-text-only states).
export function rebuildCurrentMessage(state: ConversationState, session: SessionData): Message | null {
  if (typeof state === 'string' && state.startsWith('SYMPTOM_')) {
    const idx = parseInt(state.replace('SYMPTOM_', ''), 10);
    const q = SYMPTOM_QUESTIONS[idx - 1];
    return q ? buildScreeningQuestionMessage(q) : null;
  }
  if (typeof state === 'string' && state.startsWith('RISK_FACTOR_')) {
    const idx = parseInt(state.replace('RISK_FACTOR_', ''), 10);
    const q = RISK_FACTOR_QUESTIONS[idx - 1];
    return q ? buildScreeningQuestionMessage(q) : null;
  }
  switch (state) {
    case 'REFERRAL_CHOICE': {
      const assisted = t('opt.referral_type.assisted', RESPONSE_OPTIONS.referral_type.assisted);
      const self = t('opt.referral_type.self', RESPONSE_OPTIONS.referral_type.self);
      return withScreeningActions(
        createBotMessage(t('msg.result_presumptive', BOT_MESSAGES.result_presumptive), [
          { id: 'assisted', labelMm: assisted.mm, labelEn: assisted.en },
          { id: 'self', labelMm: self.mm, labelEn: self.en },
        ]),
        'REFERRAL_CHOICE'
      );
    }
    case 'ASSISTED_CONSENT': {
      const yes = t('opt.consent.yes', RESPONSE_OPTIONS.consent.yes);
      const no = t('opt.consent.no', RESPONSE_OPTIONS.consent.no);
      return withScreeningActions(
        createBotMessage(t('msg.assisted_referral_consent', BOT_MESSAGES.assisted_referral_consent), [
          { id: 'consent_yes', labelMm: yes.mm, labelEn: yes.en },
          { id: 'consent_no', labelMm: no.mm, labelEn: no.en },
        ]),
        'ASSISTED_CONSENT'
      );
    }
    case 'ASK_AGE':
      return buildAgeBucketMessage();
    case 'SELF_ASK_STATE':
      return withScreeningActions(buildStateChoiceMessage(), 'SELF_ASK_STATE');
    case 'SELF_ASK_DISTRICT':
      return withScreeningActions(
        buildDistrictChoiceMessage(session.referralStateRegion || ''),
        'SELF_ASK_DISTRICT'
      );
    case 'SELF_ASK_TOWNSHIP':
      return withScreeningActions(
        buildTownshipChoiceMessage(session.referralStateRegion || '', session.referralDistrict || ''),
        'SELF_ASK_TOWNSHIP'
      );
    default:
      return null;
  }
}

// Per-state explanation when user taps "What does this mean?". Returns null if
// the state doesn't have a generic explanation (symptom/RF questions have
// per-question explanations handled separately by buildExplanationMessage).
export function getExplanationForState(state: ConversationState): Message | null {
  if (state === 'REFERRAL_CHOICE') {
    const body = t('msg.explain_referral_choice', BOT_MESSAGES.explain_referral_choice);
    return { id: generateId(), sender: 'bot', textMm: body.mm, textEn: body.en, timestamp: Date.now() };
  }
  if (state === 'ASSISTED_CONSENT') {
    const body = t('msg.explain_assisted_consent', BOT_MESSAGES.explain_assisted_consent);
    return { id: generateId(), sender: 'bot', textMm: body.mm, textEn: body.en, timestamp: Date.now() };
  }
  return null;
}

// Builds the question text + yes/no buttons. Action buttons (explain / back /
// exit) are appended afterwards via withScreeningActions(), so the same builder
// is reusable when re-displaying a question after a Back tap.
function buildScreeningQuestionMessageBare(question: ScreeningQuestion): Message {
  const qText = t(`question.${question.id}.text`, { en: question.textEn, mm: question.textMm });
  const yes = t('opt.yes_no.yes', RESPONSE_OPTIONS.yes_no.yes);
  const no = t('opt.yes_no.no', RESPONSE_OPTIONS.yes_no.no);
  const total = question.category === 'symptom' ? SYMPTOM_QUESTIONS.length : RISK_FACTOR_QUESTIONS.length;
  const labelEn = question.category === 'symptom' ? 'Symptom' : 'Risk factor';
  const labelMm = question.category === 'symptom' ? 'လက္ခဏာ' : 'ဖြစ်နိုင်ခြေ';
  return {
    id: generateId(),
    sender: 'bot',
    textMm: `${labelMm} ${question.index}/${total}:\n${qText.mm}`,
    textEn: `${labelEn} ${question.index}/${total}:\n${qText.en}`,
    timestamp: Date.now(),
    options: [
      { id: 'yes', labelMm: yes.mm, labelEn: yes.en },
      { id: 'no', labelMm: no.mm, labelEn: no.en },
    ],
    optionType: 'single',
  };
}

export function buildScreeningQuestionMessage(question: ScreeningQuestion): Message {
  const state = (question.category === 'symptom'
    ? `SYMPTOM_${question.index}`
    : `RISK_FACTOR_${question.index}`) as ConversationState;
  return withScreeningActions(buildScreeningQuestionMessageBare(question), state);
}

// Legacy alias used by ChatWindow
export const buildSymptomMessage = buildScreeningQuestionMessage;

export function buildExplanationMessage(question: ScreeningQuestion): Message {
  const expl = t(`question.${question.id}.explanation`, {
    en: question.explanationEn,
    mm: question.explanationMm,
  });
  return {
    id: generateId(),
    sender: 'bot',
    textMm: `💡 ${expl.mm}`,
    textEn: `💡 ${expl.en}`,
    timestamp: Date.now(),
  };
}

export function buildBackAtFirstMessage(): Message {
  const msg = t('msg.screening_back_at_first', BOT_MESSAGES.screening_back_at_first);
  return {
    id: generateId(),
    sender: 'bot',
    textMm: msg.mm,
    textEn: msg.en,
    timestamp: Date.now(),
  };
}

export function buildExitMessage(): Message {
  const msg = t('msg.screening_exit_confirmation', BOT_MESSAGES.screening_exit_confirmation);
  return {
    id: generateId(),
    sender: 'bot',
    textMm: msg.mm,
    textEn: msg.en,
    timestamp: Date.now(),
    options: getEndOptions(),
    optionType: 'single',
  };
}

// ----- Back navigation -----
// For every state, returns either { atFirst: true } (no previous step) or a
// concrete previous state + the message to re-show + the session with the
// just-recorded answer cleared.

export type BackResult =
  | { atFirst: true }
  | { atFirst?: false; prevState: ConversationState; prevMessage: Message; updatedSession: SessionData };

export function goBack(state: ConversationState, session: SessionData): BackResult {
  const updated: SessionData = { ...session, symptoms: { ...session.symptoms }, riskFactors: { ...session.riskFactors } };

  // Symptom Q
  if (typeof state === 'string' && state.startsWith('SYMPTOM_')) {
    const idx = parseInt(state.replace('SYMPTOM_', ''), 10);
    if (idx <= 1) return { atFirst: true };
    const prevQ = SYMPTOM_QUESTIONS[idx - 2];
    delete updated.symptoms[prevQ.id];
    return {
      prevState: `SYMPTOM_${idx - 1}` as ConversationState,
      prevMessage: buildScreeningQuestionMessage(prevQ),
      updatedSession: updated,
    };
  }

  // Risk-factor Q (RF1 → S8)
  if (typeof state === 'string' && state.startsWith('RISK_FACTOR_')) {
    const idx = parseInt(state.replace('RISK_FACTOR_', ''), 10);
    if (idx <= 1) {
      const s8 = SYMPTOM_QUESTIONS[7];
      delete updated.symptoms[s8.id];
      return {
        prevState: 'SYMPTOM_8' as ConversationState,
        prevMessage: buildScreeningQuestionMessage(s8),
        updatedSession: updated,
      };
    }
    const prevQ = RISK_FACTOR_QUESTIONS[idx - 2];
    delete updated.riskFactors[prevQ.id];
    return {
      prevState: `RISK_FACTOR_${idx - 1}` as ConversationState,
      prevMessage: buildScreeningQuestionMessage(prevQ),
      updatedSession: updated,
    };
  }

  switch (state) {
    case 'ASK_NAME': {
      if (updated.ageGroup === 'pediatric') {
        // Pediatric — skipped the RF pass, so back goes to S8
        const s8 = SYMPTOM_QUESTIONS[7];
        delete updated.symptoms[s8.id];
        return {
          prevState: 'SYMPTOM_8',
          prevMessage: buildScreeningQuestionMessage(s8),
          updatedSession: updated,
        };
      }
      // Adult — back to RF10 (clears RF10 answer)
      const rf10 = RISK_FACTOR_QUESTIONS[9];
      delete updated.riskFactors[rf10.id];
      return {
        prevState: 'RISK_FACTOR_10',
        prevMessage: buildScreeningQuestionMessage(rf10),
        updatedSession: updated,
      };
    }
    case 'ASK_GENDER': {
      updated.clientName = undefined;
      const skip = t('msg.skip', BOT_MESSAGES.skip);
      const msg = withScreeningActions(
        createBotMessage(t('msg.ask_name', BOT_MESSAGES.ask_name), [
          { id: 'skip', labelMm: skip.mm, labelEn: skip.en },
        ]),
        'ASK_NAME'
      );
      return { prevState: 'ASK_NAME', prevMessage: msg, updatedSession: updated };
    }
    case 'REFERRAL_CHOICE': {
      updated.clientGender = undefined;
      const skip = t('msg.skip', BOT_MESSAGES.skip);
      const male = t('opt.gender.male', RESPONSE_OPTIONS.gender.male);
      const female = t('opt.gender.female', RESPONSE_OPTIONS.gender.female);
      const msg = withScreeningActions(
        createBotMessage(t('msg.ask_gender', BOT_MESSAGES.ask_gender), [
          { id: 'male', labelMm: male.mm, labelEn: male.en },
          { id: 'female', labelMm: female.mm, labelEn: female.en },
          { id: 'skip', labelMm: skip.mm, labelEn: skip.en },
        ]),
        'ASK_GENDER'
      );
      return { prevState: 'ASK_GENDER', prevMessage: msg, updatedSession: updated };
    }
    case 'ASSISTED_CONSENT':
    case 'SELF_ASK_STATE': {
      updated.referralType = undefined;
      const assisted = t('opt.referral_type.assisted', RESPONSE_OPTIONS.referral_type.assisted);
      const self = t('opt.referral_type.self', RESPONSE_OPTIONS.referral_type.self);
      const msg = withScreeningActions(
        createBotMessage(t('msg.result_presumptive', BOT_MESSAGES.result_presumptive), [
          { id: 'assisted', labelMm: assisted.mm, labelEn: assisted.en },
          { id: 'self', labelMm: self.mm, labelEn: self.en },
        ]),
        'REFERRAL_CHOICE'
      );
      return { prevState: 'REFERRAL_CHOICE', prevMessage: msg, updatedSession: updated };
    }
    case 'ASSISTED_ASK_PHONE': {
      updated.consentToPhoneContact = undefined;
      const yes = t('opt.consent.yes', RESPONSE_OPTIONS.consent.yes);
      const no = t('opt.consent.no', RESPONSE_OPTIONS.consent.no);
      const msg = withScreeningActions(
        createBotMessage(t('msg.assisted_referral_consent', BOT_MESSAGES.assisted_referral_consent), [
          { id: 'consent_yes', labelMm: yes.mm, labelEn: yes.en },
          { id: 'consent_no', labelMm: no.mm, labelEn: no.en },
        ]),
        'ASSISTED_CONSENT'
      );
      return { prevState: 'ASSISTED_CONSENT', prevMessage: msg, updatedSession: updated };
    }
    case 'SELF_ASK_DISTRICT': {
      updated.referralStateRegion = undefined;
      return {
        prevState: 'SELF_ASK_STATE',
        prevMessage: withScreeningActions(buildStateChoiceMessage(), 'SELF_ASK_STATE'),
        updatedSession: updated,
      };
    }
    case 'SELF_ASK_TOWNSHIP': {
      updated.referralDistrict = undefined;
      return {
        prevState: 'SELF_ASK_DISTRICT',
        prevMessage: withScreeningActions(
          buildDistrictChoiceMessage(updated.referralStateRegion || ''),
          'SELF_ASK_DISTRICT'
        ),
        updatedSession: updated,
      };
    }
    case 'SELF_ASK_TOWNSHIP_FREEFORM': {
      // Back to the township button menu (keeps state+district context)
      return {
        prevState: 'SELF_ASK_TOWNSHIP',
        prevMessage: withScreeningActions(
          buildTownshipChoiceMessage(updated.referralStateRegion || '', updated.referralDistrict || ''),
          'SELF_ASK_TOWNSHIP'
        ),
        updatedSession: updated,
      };
    }
    case 'SELF_ASK_CONTACT': {
      updated.referralTownship = undefined;
      return {
        prevState: 'SELF_ASK_TOWNSHIP',
        prevMessage: withScreeningActions(
          buildTownshipChoiceMessage(updated.referralStateRegion || '', updated.referralDistrict || ''),
          'SELF_ASK_TOWNSHIP'
        ),
        updatedSession: updated,
      };
    }
    default:
      return { atFirst: true };
  }
}

export function buildAgeBucketMessage(): Message {
  const body = t('msg.ask_age', BOT_MESSAGES.ask_age);
  const u5 = t('opt.age_group.under_5', RESPONSE_OPTIONS.age_group.under_5);
  const ped = t('opt.age_group.pediatric', RESPONSE_OPTIONS.age_group.pediatric);
  const adult = t('opt.age_group.adult', RESPONSE_OPTIONS.age_group.adult);
  return {
    id: generateId(),
    sender: 'bot',
    textMm: body.mm,
    textEn: body.en,
    timestamp: Date.now(),
    options: [
      { id: 'age_under_5', labelMm: u5.mm, labelEn: u5.en },
      { id: 'age_pediatric', labelMm: ped.mm, labelEn: ped.en },
      { id: 'age_adult', labelMm: adult.mm, labelEn: adult.en },
    ],
    optionType: 'single',
  };
}

export function getLandingMessage(): Message {
  const body = t('msg.landing_branching', BOT_MESSAGES.landing_branching);
  const c1 = t('opt.landing.choice_1', RESPONSE_OPTIONS.landing.choice_1);
  const c2 = t('opt.landing.choice_2', RESPONSE_OPTIONS.landing.choice_2);
  const c1Label = t('msg.landing_choice_1_label', BOT_MESSAGES.landing_choice_1_label);
  const c2Label = t('msg.landing_choice_2_label', BOT_MESSAGES.landing_choice_2_label);
  return {
    id: generateId(),
    sender: 'bot',
    textMm: body.mm,
    textEn: body.en,
    timestamp: Date.now(),
    options: [
      { id: 'landing_1', labelMm: `${c1.mm} — ${c1Label.mm}`, labelEn: `${c1.en} — ${c1Label.en}` },
      { id: 'landing_2', labelMm: `${c2.mm} — ${c2Label.mm}`, labelEn: `${c2.en} — ${c2Label.en}` },
    ],
    optionType: 'single',
  };
}

export const getWelcomeMessage = getLandingMessage;

// ----- Location cascade builders (read from locationRegistry) -----

function locationButtons(
  labels: { en: string; mm: string }[],
  idPrefix: string,
  includeOtherTownship = false
): MessageOption[] {
  const opts: MessageOption[] = labels.map((l, i) => ({
    id: `${idPrefix}::${l.en || l.mm || i}`,
    labelMm: l.mm || l.en,
    labelEn: l.en || l.mm,
  }));
  if (includeOtherTownship) {
    const other = t('msg.self_referral_other_township', BOT_MESSAGES.self_referral_other_township);
    opts.push({
      id: 'township_other',
      labelMm: other.mm,
      labelEn: other.en,
    });
  }
  return opts;
}

export function buildStateChoiceMessage(): Message {
  const body = t('msg.self_referral_ask_state', BOT_MESSAGES.self_referral_ask_state);
  return {
    id: generateId(),
    sender: 'bot',
    textMm: body.mm,
    textEn: body.en,
    timestamp: Date.now(),
    options: locationButtons(getStates(), 'state'),
    optionType: 'single',
  };
}

export function buildDistrictChoiceMessage(stateEn: string): Message {
  const body = t('msg.self_referral_ask_district', BOT_MESSAGES.self_referral_ask_district);
  return {
    id: generateId(),
    sender: 'bot',
    textMm: body.mm,
    textEn: body.en,
    timestamp: Date.now(),
    options: locationButtons(getDistricts(stateEn), 'district'),
    optionType: 'single',
  };
}

export function buildTownshipChoiceMessage(stateEn: string, districtEn: string): Message {
  const townships = getTownships(stateEn, districtEn);
  if (townships.length === 0) {
    const body = t('msg.self_referral_no_townships_in_district', BOT_MESSAGES.self_referral_no_townships_in_district);
    return {
      id: generateId(),
      sender: 'bot',
      textMm: body.mm,
      textEn: body.en,
      timestamp: Date.now(),
      options: locationButtons([], 'township', true),
      optionType: 'single',
    };
  }
  const body = t('msg.self_referral_ask_township', BOT_MESSAGES.self_referral_ask_township);
  return {
    id: generateId(),
    sender: 'bot',
    textMm: body.mm,
    textEn: body.en,
    timestamp: Date.now(),
    options: locationButtons(townships, 'township', true),
    optionType: 'single',
  };
}

// ----- Main state machine -----

export function processUserInput(
  state: ConversationState,
  input: string,
  session: SessionData
): { nextState: ConversationState; botMessage: Message; updatedSession: SessionData } {
  const r = processUserInputInner(state, input, session);
  return {
    ...r,
    botMessage: withScreeningActions(r.botMessage, r.nextState),
  };
}

function processUserInputInner(
  state: ConversationState,
  input: string,
  session: SessionData
): { nextState: ConversationState; botMessage: Message; updatedSession: SessionData } {
  const updatedSession: SessionData = { ...session };

  switch (state) {
    case 'LANDING': {
      if (input === 'landing_1') {
        updatedSession.landingChoice = '1';
        return {
          nextState: 'ASK_AGE',
          botMessage: buildAgeBucketMessage(),
          updatedSession,
        };
      }
      if (input === 'landing_2') {
        // v0.9 — landing choice 2 hands off to the P3 LLM chat panel
        // (rendered by page.tsx based on session.landingChoice).
        // The P1 state machine stays at LANDING for the rest of this
        // session; P3 manages its own message list.
        updatedSession.landingChoice = '2';
        return {
          nextState: 'LANDING',
          botMessage: getLandingMessage(),  // unused; page swaps to P3ChatPanel
          updatedSession,
        };
      }
      return { nextState: 'LANDING', botMessage: getLandingMessage(), updatedSession };
    }

    case 'ASK_AGE': {
      // v0.7 — age groups instead of free-text age (matches old SCH FB bot).
      if (input === 'age_under_5') {
        updatedSession.ageGroup = 'under_5';
        updatedSession.under15Excluded = true;
        updatedSession.status = 'completed';
        return {
          nextState: 'AGE_UNDER_5',
          botMessage: createBotMessage(t('msg.age_under_5', BOT_MESSAGES.age_under_5), getEndOptions()),
          updatedSession,
        };
      }
      if (input === 'age_pediatric') {
        updatedSession.ageGroup = 'pediatric';
        return {
          nextState: 'SYMPTOM_INTRO',
          botMessage: createBotMessage(t('msg.symptom_intro_pediatric', BOT_MESSAGES.symptom_intro_pediatric)),
          updatedSession,
        };
      }
      if (input === 'age_adult') {
        updatedSession.ageGroup = 'adult';
        return {
          nextState: 'SYMPTOM_INTRO',
          botMessage: createBotMessage(t('msg.symptom_intro', BOT_MESSAGES.symptom_intro)),
          updatedSession,
        };
      }
      // Unknown — re-ask
      return {
        nextState: 'ASK_AGE',
        botMessage: buildAgeBucketMessage(),
        updatedSession,
      };
    }

    case 'SYMPTOM_INTRO': {
      return {
        nextState: 'SYMPTOM_1',
        botMessage: buildScreeningQuestionMessage(SYMPTOM_QUESTIONS[0]),
        updatedSession,
      };
    }

    // Generic symptom Q handler — answer recorded, advance to next or to RF intro
    case 'SYMPTOM_1':
    case 'SYMPTOM_2':
    case 'SYMPTOM_3':
    case 'SYMPTOM_4':
    case 'SYMPTOM_5':
    case 'SYMPTOM_6':
    case 'SYMPTOM_7':
    case 'SYMPTOM_8': {
      const idx = parseInt((state as string).replace('SYMPTOM_', ''), 10);
      const q = SYMPTOM_QUESTIONS[idx - 1];
      updatedSession.symptoms[q.id] = input === 'yes';

      if (idx < SYMPTOM_QUESTIONS.length) {
        return {
          nextState: `SYMPTOM_${idx + 1}` as ConversationState,
          botMessage: buildScreeningQuestionMessage(SYMPTOM_QUESTIONS[idx]),
          updatedSession,
        };
      }
      // After last symptom — pediatric skips RF pass + goes straight to demographics
      if (updatedSession.ageGroup === 'pediatric') {
        const skip = t('msg.skip', BOT_MESSAGES.skip);
        return {
          nextState: 'ASK_NAME',
          botMessage: createBotMessage(t('msg.ask_name', BOT_MESSAGES.ask_name), [
            { id: 'skip', labelMm: skip.mm, labelEn: skip.en },
          ]),
          updatedSession,
        };
      }
      // Adult — risk factor intro
      return {
        nextState: 'RISK_FACTOR_INTRO',
        botMessage: createBotMessage(t('msg.risk_factor_intro', BOT_MESSAGES.risk_factor_intro)),
        updatedSession,
      };
    }

    case 'RISK_FACTOR_INTRO': {
      return {
        nextState: 'RISK_FACTOR_1',
        botMessage: buildScreeningQuestionMessage(RISK_FACTOR_QUESTIONS[0]),
        updatedSession,
      };
    }

    case 'RISK_FACTOR_1':
    case 'RISK_FACTOR_2':
    case 'RISK_FACTOR_3':
    case 'RISK_FACTOR_4':
    case 'RISK_FACTOR_5':
    case 'RISK_FACTOR_6':
    case 'RISK_FACTOR_7':
    case 'RISK_FACTOR_8':
    case 'RISK_FACTOR_9':
    case 'RISK_FACTOR_10': {
      const idx = parseInt((state as string).replace('RISK_FACTOR_', ''), 10);
      const q = RISK_FACTOR_QUESTIONS[idx - 1];
      updatedSession.riskFactors[q.id] = input === 'yes';

      if (idx < RISK_FACTOR_QUESTIONS.length) {
        return {
          nextState: `RISK_FACTOR_${idx + 1}` as ConversationState,
          botMessage: buildScreeningQuestionMessage(RISK_FACTOR_QUESTIONS[idx]),
          updatedSession,
        };
      }
      // After last risk factor → name
      return {
        nextState: 'ASK_NAME',
        botMessage: createBotMessage(t('msg.ask_name', BOT_MESSAGES.ask_name), [
          { id: 'skip', labelMm: t('msg.skip', BOT_MESSAGES.skip).mm, labelEn: t('msg.skip', BOT_MESSAGES.skip).en },
        ]),
        updatedSession,
      };
    }

    case 'ASK_NAME': {
      if (input !== 'skip') updatedSession.clientName = input;
      const skip = t('msg.skip', BOT_MESSAGES.skip);
      const male = t('opt.gender.male', RESPONSE_OPTIONS.gender.male);
      const female = t('opt.gender.female', RESPONSE_OPTIONS.gender.female);
      return {
        nextState: 'ASK_GENDER',
        botMessage: createBotMessage(t('msg.ask_gender', BOT_MESSAGES.ask_gender), [
          { id: 'male', labelMm: male.mm, labelEn: male.en },
          { id: 'female', labelMm: female.mm, labelEn: female.en },
          { id: 'skip', labelMm: skip.mm, labelEn: skip.en },
        ]),
        updatedSession,
      };
    }

    case 'ASK_GENDER': {
      if (input !== 'skip') {
        updatedSession.clientGender = input === 'male' ? 'M' : 'F';
      }
      return classify(updatedSession);
    }

    case 'REFERRAL_CHOICE': {
      updatedSession.screeningId = updatedSession.screeningId || generateScreeningId();
      if (input === 'assisted') {
        updatedSession.referralType = 'Assisted';
        const yes = t('opt.consent.yes', RESPONSE_OPTIONS.consent.yes);
        const no = t('opt.consent.no', RESPONSE_OPTIONS.consent.no);
        return {
          nextState: 'ASSISTED_CONSENT',
          botMessage: createBotMessage(t('msg.assisted_referral_consent', BOT_MESSAGES.assisted_referral_consent), [
            { id: 'consent_yes', labelMm: yes.mm, labelEn: yes.en },
            { id: 'consent_no', labelMm: no.mm, labelEn: no.en },
          ]),
          updatedSession,
        };
      }
      updatedSession.referralType = 'Self';
      return {
        nextState: 'SELF_ASK_STATE',
        botMessage: buildStateChoiceMessage(),
        updatedSession,
      };
    }

    case 'ASSISTED_CONSENT': {
      if (input === 'consent_yes') {
        updatedSession.consentToPhoneContact = true;
        return {
          nextState: 'ASSISTED_ASK_PHONE',
          botMessage: createBotMessage(t('msg.assisted_referral_ask_phone', BOT_MESSAGES.assisted_referral_ask_phone)),
          updatedSession,
        };
      }
      updatedSession.consentToPhoneContact = false;
      updatedSession.referralType = 'None';
      updatedSession.status = 'completed';
      return {
        nextState: 'ASSISTED_NO_CONSENT',
        botMessage: createBotMessage(t('msg.assisted_referral_no_consent', BOT_MESSAGES.assisted_referral_no_consent), getEndOptions()),
        updatedSession,
      };
    }

    case 'ASSISTED_ASK_PHONE': {
      updatedSession.clientPhone = input;
      updatedSession.status = 'completed';
      const scrId = updatedSession.screeningId || '';
      const idMsg = t('msg.screening_id_instruction', BOT_MESSAGES.screening_id_instruction);
      const result = t('msg.assisted_referral_result', BOT_MESSAGES.assisted_referral_result);
      const chans = t('msg.followup_channels', BOT_MESSAGES.followup_channels);
      return {
        nextState: 'ASSISTED_RESULT',
        botMessage: createBotMessage({
          mm: result.mm + idMsg.mm.replace('{SCREENING_ID}', scrId) + '\n\n' + chans.mm,
          en: result.en + idMsg.en.replace('{SCREENING_ID}', scrId) + '\n\n' + chans.en,
        }, getEndOptions()),
        updatedSession,
      };
    }

    case 'SELF_ASK_STATE': {
      // Buttons send 'state::<stateEn>'; free-text accepted as the state name
      const stateEn = input.startsWith('state::') ? input.slice('state::'.length) : input;
      updatedSession.referralStateRegion = stateEn;
      return {
        nextState: 'SELF_ASK_DISTRICT',
        botMessage: buildDistrictChoiceMessage(stateEn),
        updatedSession,
      };
    }

    case 'SELF_ASK_DISTRICT': {
      const districtEn = input.startsWith('district::') ? input.slice('district::'.length) : input;
      updatedSession.referralDistrict = districtEn;
      return {
        nextState: 'SELF_ASK_TOWNSHIP',
        botMessage: buildTownshipChoiceMessage(updatedSession.referralStateRegion || '', districtEn),
        updatedSession,
      };
    }

    case 'SELF_ASK_TOWNSHIP': {
      if (input === 'township_other') {
        return {
          nextState: 'SELF_ASK_TOWNSHIP_FREEFORM',
          botMessage: createBotMessage(t('msg.self_referral_ask_township_freeform', BOT_MESSAGES.self_referral_ask_township_freeform)),
          updatedSession,
        };
      }
      const townshipEn = input.startsWith('township::') ? input.slice('township::'.length) : input;
      updatedSession.referralTownship = townshipEn;
      const skip = t('msg.skip', BOT_MESSAGES.skip);
      return {
        nextState: 'SELF_ASK_CONTACT',
        botMessage: createBotMessage(t('msg.self_referral_ask_contact', BOT_MESSAGES.self_referral_ask_contact), [
          { id: 'skip', labelMm: skip.mm, labelEn: skip.en },
        ]),
        updatedSession,
      };
    }

    case 'SELF_ASK_TOWNSHIP_FREEFORM': {
      updatedSession.referralTownship = input;
      const skip = t('msg.skip', BOT_MESSAGES.skip);
      return {
        nextState: 'SELF_ASK_CONTACT',
        botMessage: createBotMessage(t('msg.self_referral_ask_contact', BOT_MESSAGES.self_referral_ask_contact), [
          { id: 'skip', labelMm: skip.mm, labelEn: skip.en },
        ]),
        updatedSession,
      };
    }

    case 'SELF_ASK_CONTACT': {
      if (input !== 'skip') updatedSession.clientPhone = input;
      updatedSession.status = 'completed';
      return {
        nextState: 'SELF_RESULT',
        botMessage: createBotMessage({ mm: '...', en: '...' }),
        updatedSession,
      };
    }

    case 'AGE_UNDER_15':
    case 'AGE_UNDER_5':
    case 'DECLINE':
    case 'EXITED':
    case 'P3_STUB':
    case 'HEALTH_EDUCATION':
    case 'ASSISTED_RESULT':
    case 'ASSISTED_NO_CONSENT':
    case 'SELF_RESULT':
    case 'END_OPTIONS': {
      if (input === 'new_screening') {
        return {
          nextState: 'LANDING',
          botMessage: getLandingMessage(),
          updatedSession: createInitialSession(session.platformView),
        };
      }
      if (input === 'other_questions') {
        return {
          nextState: 'OTHER_QUESTIONS',
          botMessage: createBotMessage(t('msg.other_questions_placeholder', BOT_MESSAGES.other_questions_placeholder), getEndOptions()),
          updatedSession,
        };
      }
      return {
        nextState: 'GOODBYE',
        botMessage: createBotMessage(t('msg.goodbye', BOT_MESSAGES.goodbye)),
        updatedSession: { ...updatedSession, completedAt: new Date().toISOString() },
      };
    }

    case 'OTHER_QUESTIONS': {
      if (input === 'new_screening' || input === 'end') {
        return processUserInput('END_OPTIONS', input, session);
      }
      return {
        nextState: 'OTHER_QUESTIONS',
        botMessage: createBotMessage(t('msg.other_questions_placeholder', BOT_MESSAGES.other_questions_placeholder), getEndOptions()),
        updatedSession,
      };
    }

    default:
      return { nextState: 'LANDING', botMessage: getLandingMessage(), updatedSession };
  }
}

// Computes the classification.
// - Adults (15+): Q6's 3-bucket logic — any symptom Yes = Presumptive; else
//   any RF Yes = Negative (High Risk); else Not Presumptive.
// - Pediatric (5-14): old-SCH-bot rule — 2+ symptom Yes = Presumptive,
//   else Not Presumptive. Risk-factor pass is skipped for pediatric.
function classify(
  session: SessionData
): { nextState: ConversationState; botMessage: Message; updatedSession: SessionData } {
  const updatedSession = { ...session };
  const symptomYesCount = Object.values(updatedSession.symptoms).filter(v => v === true).length;
  const hasAnyRiskFactor = Object.values(updatedSession.riskFactors).some(v => v === true);

  if (updatedSession.ageGroup === 'pediatric') {
    updatedSession.classification = symptomYesCount >= 2 ? 'Presumptive TB' : 'Not Presumptive TB';
  } else if (symptomYesCount >= 1) {
    updatedSession.classification = 'Presumptive TB';
  } else if (hasAnyRiskFactor) {
    updatedSession.classification = 'Negative (High Risk)';
  } else {
    updatedSession.classification = 'Not Presumptive TB';
  }

  // Pos OR Neg-high-risk: show Q8 message + offer referral
  if (updatedSession.classification === 'Presumptive TB' || updatedSession.classification === 'Negative (High Risk)') {
    updatedSession.screeningId = updatedSession.screeningId || generateScreeningId();
    const assisted = t('opt.referral_type.assisted', RESPONSE_OPTIONS.referral_type.assisted);
    const self = t('opt.referral_type.self', RESPONSE_OPTIONS.referral_type.self);
    return {
      nextState: 'REFERRAL_CHOICE',
      botMessage: createBotMessage(t('msg.result_presumptive', BOT_MESSAGES.result_presumptive), [
        { id: 'assisted', labelMm: assisted.mm, labelEn: assisted.en },
        { id: 'self', labelMm: self.mm, labelEn: self.en },
      ]),
      updatedSession,
    };
  }

  // Neg: health education + end
  const notPres = t('msg.result_not_presumptive', BOT_MESSAGES.result_not_presumptive);
  const hEd = t('msg.health_education', BOT_MESSAGES.health_education);
  const chans = t('msg.followup_channels', BOT_MESSAGES.followup_channels);
  return {
    nextState: 'HEALTH_EDUCATION',
    botMessage: createBotMessage(
      { mm: notPres.mm + '\n\n' + hEd.mm + '\n\n' + chans.mm, en: notPres.en + '\n\n' + hEd.en + '\n\n' + chans.en },
      getEndOptions()
    ),
    updatedSession: { ...updatedSession, referralType: 'None', status: 'completed' },
  };
}

function createBotMessage(
  text: { mm: string; en: string },
  options?: MessageOption[],
  optionType?: 'single' | 'multi'
): Message {
  return {
    id: generateId(),
    sender: 'bot',
    textMm: text.mm,
    textEn: text.en,
    timestamp: Date.now(),
    options,
    optionType: optionType || (options ? 'single' : undefined),
  };
}

function getEndOptions(): MessageOption[] {
  const ns = t('opt.end_options.new_screening', RESPONSE_OPTIONS.end_options.new_screening);
  const oq = t('opt.end_options.other_questions', RESPONSE_OPTIONS.end_options.other_questions);
  const end = t('opt.end_options.end', RESPONSE_OPTIONS.end_options.end);
  return [
    { id: 'new_screening', labelMm: ns.mm, labelEn: ns.en },
    { id: 'other_questions', labelMm: oq.mm, labelEn: oq.en },
    { id: 'end', labelMm: end.mm, labelEn: end.en },
  ];
}

// ----- Referral letter (Q17 + screening ID) -----
// Lists ALL 8 symptoms + ALL 10 risk factors with Present/Absent flags,
// includes the screening ID, and ends with the SCH service-availability
// disclaimer.

export function generateReferralLetter(
  session: SessionData,
  facilityName: string,
  township: string
): { mm: string; en: string } {
  const date = new Date().toLocaleDateString('en-GB');
  const scrId = session.screeningId || '';

  const flag = (b: boolean | undefined, lang: 'en' | 'mm'): string => {
    if (b === true) return lang === 'en' ? 'Present' : 'ရှိ';
    if (b === false) return lang === 'en' ? 'Absent' : 'မရှိ';
    return lang === 'en' ? '—' : '—';
  };

  const symptomLinesEn = SYMPTOM_QUESTIONS
    .map(q => `   [${flag(session.symptoms[q.id], 'en').padEnd(7)}] ${q.textEn.replace(/\?$/, '')}`)
    .join('\n');
  const symptomLinesMm = SYMPTOM_QUESTIONS
    .map(q => `   [${flag(session.symptoms[q.id], 'mm')}] ${q.textMm.replace(/\?$/, '')}`)
    .join('\n');

  const rfLinesEn = RISK_FACTOR_QUESTIONS
    .map(q => `   [${flag(session.riskFactors[q.id], 'en').padEnd(7)}] ${q.textEn.replace(/\?$/, '')}`)
    .join('\n');
  const rfLinesMm = RISK_FACTOR_QUESTIONS
    .map(q => `   [${flag(session.riskFactors[q.id], 'mm')}] ${q.textMm.replace(/\?$/, '')}`)
    .join('\n');

  const reasonEn = session.classification === 'Presumptive TB'
    ? 'TB signs/symptoms present — continue further evaluation and assessment for TB'
    : 'No active TB signs/symptoms but risk factor(s) present — continue evaluation for TB';
  const reasonMm = session.classification === 'Presumptive TB'
    ? 'တီဘီရောဂါ လက္ခဏာ ရှိနေ၍ — ဆက်လက်စစ်ဆေးပေးရန်'
    : 'တီဘီရောဂါ လက္ခဏာ မရှိသော်လည်း ဖြစ်နိုင်ခြေ အချက်များ ရှိ၍ — ဆက်လက်စစ်ဆေးပေးရန်';

  const disclaimer = t('msg.referral_disclaimer', BOT_MESSAGES.referral_disclaimer);
  const stateLine = session.referralStateRegion ? `State/Region: ${session.referralStateRegion}\n` : '';
  const districtLine = session.referralDistrict ? `District: ${session.referralDistrict}\n` : '';
  const stateLineMm = session.referralStateRegion ? `တိုင်း/ပြည်နယ်: ${session.referralStateRegion}\n` : '';
  const districtLineMm = session.referralDistrict ? `ခရိုင်: ${session.referralDistrict}\n` : '';

  const en = `═══════════════════════════════
TB SCREENING REFERRAL SLIP
═══════════════════════════════
Date: ${date}
Screening ID: ${scrId}
Referral Provider: TB Self-Check Chatbot
${stateLine}${districtLine}Township: ${township}

To: Township TB Medical Officer / THD / TB Centre / Sun Clinic

1. CLIENT INFORMATION
   Name: ${session.clientName || 'Not provided'}
   Age group: ${session.ageGroup === 'pediatric' ? 'Pediatric (5-14)' : session.ageGroup === 'adult' ? 'Adult (15+)' : session.ageGroup === 'under_5' ? 'Under 5' : (session.clientAge || 'Not provided')}
   Sex: ${session.clientGender === 'M' ? 'Male' : session.clientGender === 'F' ? 'Female' : 'Not provided'}
   Phone: ${session.clientPhone || 'Not provided'}

2. SIGNS / SYMPTOMS
${symptomLinesEn}

3. RISK FACTORS
${rfLinesEn}

4. REASON FOR REFERRAL
   ${reasonEn}

5. CLASSIFICATION
   ${session.classification}

6. INSTRUCTIONS
${disclaimer.en.split('\n').map(l => '   ' + l).join('\n')}

Referring Agent: TB Self-Check Chatbot
═══════════════════════════════`;

  const mm = `═══════════════════════════════
တီဘီရောဂါ စစ်ဆေးခြင်း လွှဲပြောင်းလွှာ
═══════════════════════════════
ရက်စွဲ: ${date}
စစ်ဆေးမှု ID: ${scrId}
လွှဲပြောင်းသူ: တီဘီ ကိုယ်တိုင်စစ်ဆေး Chatbot
${stateLineMm}${districtLineMm}မြို့နယ်: ${township}

သို့: မြို့နယ် တီဘီ ဆရာဝန် / ကျန်းမာရေးဌာန / တီဘီစင်တာ / "နေ" ဆေးခန်း

၁။ လူနာ အချက်အလက်
   အမည်: ${session.clientName || 'မဖြည့်ပါ'}
   အသက်အုပ်စု: ${session.ageGroup === 'pediatric' ? '၅-၁၄ နှစ်' : session.ageGroup === 'adult' ? '၁၅ နှစ်နှင့်အထက်' : session.ageGroup === 'under_5' ? '၅ နှစ်အောက်' : (session.clientAge || 'မဖြည့်ပါ')}
   ကျား/မ: ${session.clientGender === 'M' ? 'ကျား' : session.clientGender === 'F' ? 'မ' : 'မဖြည့်ပါ'}
   ဖုန်း: ${session.clientPhone || 'မဖြည့်ပါ'}

၂။ လက္ခဏာများ
${symptomLinesMm}

၃။ ဖြစ်နိုင်ခြေအချက်များ
${rfLinesMm}

၄။ လွှဲပြောင်းရသည့်အကြောင်းရင်း
   ${reasonMm}

၅။ စစ်ဆေးမှု ဆုံးဖြတ်ချက်
   ${session.classification}

၆။ ညွှန်ကြားချက်
${disclaimer.mm.split('\n').map(l => '   ' + l).join('\n')}

လွှဲပြောင်းသူ: တီဘီ ကိုယ်တိုင်စစ်ဆေး Chatbot
═══════════════════════════════`;

  return { mm, en };
}
