import { SYMPTOM_QUESTIONS, RESPONSE_OPTIONS, ScreeningQuestion } from '@/data/questions';
import { BOT_MESSAGES } from '@/data/messages';
import { t } from './textRegistry';

export const BOT_VERSION = '0.3.0';

export type ConversationState =
  | 'LANDING'
  | 'P3_STUB'
  | 'ASK_AGE'
  | 'SYMPTOM_INTRO'
  | `SYMPTOM_${number}`
  | 'ASK_NAME'
  | 'ASK_GENDER'
  | 'ASK_CONDITIONS'
  | 'CLASSIFICATION'
  | 'REFERRAL_CHOICE'
  | 'ASSISTED_ASK_PHONE'
  | 'ASSISTED_RESULT'
  | 'SELF_ASK_TOWNSHIP'
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

export interface SessionData {
  conversationId: string;
  startedAt: string;
  completedAt?: string;
  platformView: string;
  landingChoice?: '1' | '2';
  clientName?: string;
  clientAge?: number;
  clientGender?: string;
  conditionDm: boolean;
  conditionHiv: boolean;
  symptoms: Record<string, boolean>;
  classification?: 'Presumptive TB' | 'Not Presumptive TB';
  referralType?: 'Assisted' | 'Self' | 'None';
  referralTownship?: string;
  clientPhone?: string;
  clientAddress?: string;
  referralSitesShown?: string[];
  status: 'in_progress' | 'completed' | 'abandoned';
  under15Excluded: boolean;
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
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `SCR-${yy}${mm}${dd}-${code}`;
}

export function createInitialSession(platformView: string): SessionData {
  return {
    conversationId: generateId(),
    startedAt: new Date().toISOString(),
    platformView,
    conditionDm: false,
    conditionHiv: false,
    symptoms: {},
    status: 'in_progress',
    under15Excluded: false,
    botVersion: BOT_VERSION,
  };
}

// ----- Helpers for action-button handling (called from ChatWindow) -----

export function getSymptomIndexForState(state: ConversationState): number | null {
  if (typeof state !== 'string' || !state.startsWith('SYMPTOM_')) return null;
  const n = parseInt(state.replace('SYMPTOM_', ''), 10);
  return Number.isFinite(n) ? n : null;
}

export function getSymptomQuestionByIndex(index: number): ScreeningQuestion | null {
  return SYMPTOM_QUESTIONS[index - 1] || null;
}

export function getScreeningActionOptions(): MessageOption[] {
  const explain = t('opt.screening_action.explain', RESPONSE_OPTIONS.screening_action.explain);
  const back = t('opt.screening_action.back', RESPONSE_OPTIONS.screening_action.back);
  const exit = t('opt.screening_action.exit', RESPONSE_OPTIONS.screening_action.exit);
  return [
    { id: 'act_explain', labelMm: explain.mm, labelEn: explain.en },
    { id: 'act_back', labelMm: back.mm, labelEn: back.en },
    { id: 'act_exit', labelMm: exit.mm, labelEn: exit.en },
  ];
}

export function buildSymptomMessage(question: ScreeningQuestion): Message {
  const qText = t(`question.${question.id}.text`, { en: question.textEn, mm: question.textMm });
  const yes = t('opt.yes_no.yes', RESPONSE_OPTIONS.yes_no.yes);
  const no = t('opt.yes_no.no', RESPONSE_OPTIONS.yes_no.no);
  return {
    id: generateId(),
    sender: 'bot',
    textMm: `မေးခွန်း ${question.index}/8:\n${qText.mm}`,
    textEn: `Question ${question.index}/8:\n${qText.en}`,
    timestamp: Date.now(),
    options: [
      { id: 'yes', labelMm: yes.mm, labelEn: yes.en },
      { id: 'no', labelMm: no.mm, labelEn: no.en },
      ...getScreeningActionOptions(),
    ],
    optionType: 'single',
  };
}

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

// Legacy export — page.tsx still imports this. Maps to the new landing.
export const getWelcomeMessage = getLandingMessage;

export function processUserInput(
  state: ConversationState,
  input: string,
  session: SessionData,
  selectedConditions?: string[]
): { nextState: ConversationState; botMessage: Message; updatedSession: SessionData } {
  const updatedSession = { ...session };

  switch (state) {
    case 'LANDING': {
      if (input === 'landing_1') {
        updatedSession.landingChoice = '1';
        return {
          nextState: 'ASK_AGE',
          botMessage: createBotMessage(t('msg.ask_age', BOT_MESSAGES.ask_age)),
          updatedSession,
        };
      }
      if (input === 'landing_2') {
        updatedSession.landingChoice = '2';
        updatedSession.status = 'completed';
        return {
          nextState: 'P3_STUB',
          botMessage: createBotMessage(t('msg.p3_stub', BOT_MESSAGES.p3_stub), getEndOptions()),
          updatedSession,
        };
      }
      // Unknown input — re-show landing
      return {
        nextState: 'LANDING',
        botMessage: getLandingMessage(),
        updatedSession,
      };
    }

    case 'ASK_AGE': {
      const age = parseInt(input, 10);
      if (isNaN(age) || age < 0 || age > 150) {
        return {
          nextState: 'ASK_AGE',
          botMessage: createBotMessage(t('msg.age_invalid', BOT_MESSAGES.age_invalid)),
          updatedSession,
        };
      }
      updatedSession.clientAge = age;
      if (age < 15) {
        updatedSession.under15Excluded = true;
        updatedSession.status = 'completed';
        return {
          nextState: 'AGE_UNDER_15',
          botMessage: createBotMessage(t('msg.age_under_15', BOT_MESSAGES.age_under_15), getEndOptions()),
          updatedSession,
        };
      }
      return {
        nextState: 'SYMPTOM_INTRO',
        botMessage: createBotMessage(t('msg.symptom_intro', BOT_MESSAGES.symptom_intro)),
        updatedSession,
      };
    }

    case 'SYMPTOM_INTRO': {
      // Auto-advance to first symptom question
      const q = SYMPTOM_QUESTIONS[0];
      return {
        nextState: 'SYMPTOM_1',
        botMessage: buildSymptomMessage(q),
        updatedSession,
      };
    }

    case 'SYMPTOM_1':
    case 'SYMPTOM_2':
    case 'SYMPTOM_3':
    case 'SYMPTOM_4':
    case 'SYMPTOM_5':
    case 'SYMPTOM_6':
    case 'SYMPTOM_7':
    case 'SYMPTOM_8': {
      const currentIndex = parseInt(state.replace('SYMPTOM_', ''), 10);
      const currentQuestion = SYMPTOM_QUESTIONS[currentIndex - 1];
      updatedSession.symptoms[currentQuestion.id] = input === 'yes';

      if (currentIndex < 8) {
        const nextQuestion = SYMPTOM_QUESTIONS[currentIndex];
        return {
          nextState: `SYMPTOM_${currentIndex + 1}` as ConversationState,
          botMessage: buildSymptomMessage(nextQuestion),
          updatedSession,
        };
      }
      // After last symptom, ask name
      return {
        nextState: 'ASK_NAME',
        botMessage: createBotMessage(t('msg.ask_name', BOT_MESSAGES.ask_name), [
          { id: 'skip', labelMm: t('msg.skip', BOT_MESSAGES.skip).mm, labelEn: t('msg.skip', BOT_MESSAGES.skip).en },
        ]),
        updatedSession,
      };
    }

    case 'ASK_NAME': {
      if (input !== 'skip') {
        updatedSession.clientName = input;
      }
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
      const dm = t('opt.conditions.dm', RESPONSE_OPTIONS.conditions.dm);
      const hiv = t('opt.conditions.hiv', RESPONSE_OPTIONS.conditions.hiv);
      const none = t('opt.conditions.none', RESPONSE_OPTIONS.conditions.none);
      return {
        nextState: 'ASK_CONDITIONS',
        botMessage: createBotMessage(t('msg.ask_conditions', BOT_MESSAGES.ask_conditions), [
          { id: 'dm', labelMm: dm.mm, labelEn: dm.en },
          { id: 'hiv', labelMm: hiv.mm, labelEn: hiv.en },
          { id: 'none', labelMm: none.mm, labelEn: none.en },
        ], 'multi'),
        updatedSession,
      };
    }

    case 'ASK_CONDITIONS': {
      const conditions = selectedConditions || [];
      updatedSession.conditionDm = conditions.includes('dm');
      updatedSession.conditionHiv = conditions.includes('hiv');

      // Classification
      const hasSymptoms = Object.values(updatedSession.symptoms).some(v => v);
      updatedSession.classification = hasSymptoms ? 'Presumptive TB' : 'Not Presumptive TB';

      if (hasSymptoms) {
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
      const notPres = t('msg.result_not_presumptive', BOT_MESSAGES.result_not_presumptive);
      const hEd = t('msg.health_education', BOT_MESSAGES.health_education);
      return {
        nextState: 'HEALTH_EDUCATION',
        botMessage: createBotMessage({
          mm: notPres.mm + '\n\n' + hEd.mm,
          en: notPres.en + '\n\n' + hEd.en,
        }, getEndOptions()),
        updatedSession: { ...updatedSession, referralType: 'None', status: 'completed' },
      };
    }

    case 'REFERRAL_CHOICE': {
      updatedSession.screeningId = generateScreeningId();
      if (input === 'assisted') {
        updatedSession.referralType = 'Assisted';
        return {
          nextState: 'ASSISTED_ASK_PHONE',
          botMessage: createBotMessage(t('msg.assisted_referral_ask_phone', BOT_MESSAGES.assisted_referral_ask_phone)),
          updatedSession,
        };
      }
      updatedSession.referralType = 'Self';
      return {
        nextState: 'SELF_ASK_TOWNSHIP',
        botMessage: createBotMessage(t('msg.self_referral_ask_township', BOT_MESSAGES.self_referral_ask_township)),
        updatedSession,
      };
    }

    case 'ASSISTED_ASK_PHONE': {
      updatedSession.clientPhone = input;
      updatedSession.status = 'completed';
      const scrId = updatedSession.screeningId || '';
      const idMsg = t('msg.screening_id_instruction', BOT_MESSAGES.screening_id_instruction);
      const result = t('msg.assisted_referral_result', BOT_MESSAGES.assisted_referral_result);
      return {
        nextState: 'ASSISTED_RESULT',
        botMessage: createBotMessage({
          mm: result.mm + idMsg.mm.replace('{SCREENING_ID}', scrId),
          en: result.en + idMsg.en.replace('{SCREENING_ID}', scrId),
        }, getEndOptions()),
        updatedSession,
      };
    }

    case 'SELF_ASK_TOWNSHIP': {
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
      if (input !== 'skip') {
        updatedSession.clientPhone = input;
      }
      // The actual referral site lookup happens in the component
      updatedSession.status = 'completed';
      return {
        nextState: 'SELF_RESULT',
        botMessage: createBotMessage({ mm: '...', en: '...' }), // placeholder - replaced by component
        updatedSession,
      };
    }

    case 'AGE_UNDER_15':
    case 'DECLINE':
    case 'EXITED':
    case 'P3_STUB':
    case 'HEALTH_EDUCATION':
    case 'ASSISTED_RESULT':
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
      return {
        nextState: 'LANDING',
        botMessage: getLandingMessage(),
        updatedSession,
      };
  }
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

export function generateReferralLetter(session: SessionData, facilityName: string, township: string): { mm: string; en: string } {
  const date = new Date().toLocaleDateString('en-GB');
  const symptoms = SYMPTOM_QUESTIONS.filter(q => session.symptoms[q.id]);
  const symptomListEn = symptoms.map(q => `  • ${q.textEn.replace(/^Do you have |^Are you |^Have you been /i, '').replace(/\?$/, '')}`).join('\n');
  const symptomListMm = symptoms.map(q => `  • ${q.textMm.replace(/\?$/, '').replace(/ရှိပါသလား$/, '').replace(/ဖူးပါသလား$/, '')}`).join('\n');

  const en = `═══════════════════════════════
PRESUMPTIVE TB REFERRAL LETTER
═══════════════════════════════
Date: ${date}
Referral Provider: TB Self-Screening Chatbot
Area/Township: ${township}

To: Township TB Medical Officer / THD / TB Centre

1. PATIENT INFORMATION
   Name: ${session.clientName || 'Not provided'}
   Age: ${session.clientAge || 'Not provided'}
   Sex: ${session.clientGender === 'M' ? 'Male' : session.clientGender === 'F' ? 'Female' : 'Not provided'}
   Phone: ${session.clientPhone || 'Not provided'}

2. REASON FOR REFERRAL (Presumptive TB Criteria)
${symptomListEn}
   ${session.conditionDm ? '• Diabetes (DM) co-morbidity' : ''}
   ${session.conditionHiv ? '• HIV co-morbidity' : ''}

3. RECOMMENDED ACTIONS
   • Sputum collection for GeneXpert/Smear
   • Chest X-ray examination
   • Clinical evaluation${session.conditionHiv ? ' (TB/HIV co-infection)' : ''}${(session.clientAge || 0) < 18 ? ' (Pediatric TB)' : ''}

Referring Agent: TB Self-Screening Chatbot
═══════════════════════════════`;

  const mm = `═══════════════════════════════
တီဘီရောဂါ သံသယရှိသူ လွှဲပြောင်းလွှာ
═══════════════════════════════
ရက်စွဲ: ${date}
လွှဲပြောင်းသူ: တီဘီ ကိုယ်တိုင်စစ်ဆေးခြင်း Chatbot
မြို့နယ်: ${township}

သို့: မြို့နယ် တီဘီ ဆရာဝန် / ကျန်းမာရေးဌာန / တီဘီစင်တာ

၁။ လူနာအချက်အလက်
   အမည်: ${session.clientName || 'မဖြည့်ပါ'}
   အသက်: ${session.clientAge || 'မဖြည့်ပါ'}
   ကျား/မ: ${session.clientGender === 'M' ? 'ကျား' : session.clientGender === 'F' ? 'မ' : 'မဖြည့်ပါ'}
   ဖုန်း: ${session.clientPhone || 'မဖြည့်ပါ'}

၂။ လွှဲပြောင်းရသည့်အကြောင်းရင်း
${symptomListMm}
   ${session.conditionDm ? '• ဆီးချိုရောဂါ ရှိသည်' : ''}
   ${session.conditionHiv ? '• အိတ်ခ်ျအိုင်ဗွီ ရှိသည်' : ''}

၃။ အကြံပြုချက်
   • သလိပ် GeneXpert/Smear စစ်ဆေးခြင်း
   • ရင်ဘတ် ဓာတ်မှန်ရိုက်ခြင်း
   • ဆရာဝန် စစ်ဆေးခြင်း${session.conditionHiv ? ' (တီဘီ/HIV)' : ''}

လွှဲပြောင်းသူ: တီဘီ ကိုယ်တိုင်စစ်ဆေးခြင်း Chatbot
═══════════════════════════════`;

  return { mm, en };
}
