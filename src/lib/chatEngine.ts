import { SYMPTOM_QUESTIONS, RESPONSE_OPTIONS } from '@/data/questions';
import { BOT_MESSAGES } from '@/data/messages';

export type ConversationState =
  | 'WELCOME'
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
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
  };
}

export function getWelcomeMessage(): Message {
  return {
    id: generateId(),
    sender: 'bot',
    textMm: BOT_MESSAGES.welcome.mm,
    textEn: BOT_MESSAGES.welcome.en,
    timestamp: Date.now(),
    options: [
      { id: 'start_yes', labelMm: RESPONSE_OPTIONS.start.yes.mm, labelEn: RESPONSE_OPTIONS.start.yes.en },
      { id: 'start_no', labelMm: RESPONSE_OPTIONS.start.no.mm, labelEn: RESPONSE_OPTIONS.start.no.en },
    ],
    optionType: 'single',
  };
}

export function processUserInput(
  state: ConversationState,
  input: string,
  session: SessionData,
  selectedConditions?: string[]
): { nextState: ConversationState; botMessage: Message; updatedSession: SessionData } {
  const updatedSession = { ...session };

  switch (state) {
    case 'WELCOME': {
      if (input === 'start_yes') {
        return {
          nextState: 'ASK_AGE',
          botMessage: createBotMessage(BOT_MESSAGES.ask_age),
          updatedSession,
        };
      } else {
        return {
          nextState: 'DECLINE',
          botMessage: createBotMessage(BOT_MESSAGES.decline_screening, getEndOptions()),
          updatedSession: { ...updatedSession, status: 'completed' },
        };
      }
    }

    case 'ASK_AGE': {
      const age = parseInt(input, 10);
      if (isNaN(age) || age < 0 || age > 150) {
        return {
          nextState: 'ASK_AGE',
          botMessage: createBotMessage(BOT_MESSAGES.age_invalid),
          updatedSession,
        };
      }
      updatedSession.clientAge = age;
      if (age < 15) {
        updatedSession.under15Excluded = true;
        updatedSession.status = 'completed';
        return {
          nextState: 'AGE_UNDER_15',
          botMessage: createBotMessage(BOT_MESSAGES.age_under_15, getEndOptions()),
          updatedSession,
        };
      }
      return {
        nextState: 'SYMPTOM_INTRO',
        botMessage: createBotMessage(BOT_MESSAGES.symptom_intro),
        updatedSession,
      };
    }

    case 'SYMPTOM_INTRO': {
      // Auto-advance to first symptom question
      const q = SYMPTOM_QUESTIONS[0];
      return {
        nextState: 'SYMPTOM_1',
        botMessage: createSymptomMessage(q),
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
          botMessage: createSymptomMessage(nextQuestion),
          updatedSession,
        };
      }
      // After last symptom, ask name
      return {
        nextState: 'ASK_NAME',
        botMessage: createBotMessage(BOT_MESSAGES.ask_name, [
          { id: 'skip', labelMm: BOT_MESSAGES.skip.mm, labelEn: BOT_MESSAGES.skip.en },
        ]),
        updatedSession,
      };
    }

    case 'ASK_NAME': {
      if (input !== 'skip') {
        updatedSession.clientName = input;
      }
      return {
        nextState: 'ASK_GENDER',
        botMessage: createBotMessage(BOT_MESSAGES.ask_gender, [
          { id: 'male', labelMm: RESPONSE_OPTIONS.gender.male.mm, labelEn: RESPONSE_OPTIONS.gender.male.en },
          { id: 'female', labelMm: RESPONSE_OPTIONS.gender.female.mm, labelEn: RESPONSE_OPTIONS.gender.female.en },
          { id: 'skip', labelMm: BOT_MESSAGES.skip.mm, labelEn: BOT_MESSAGES.skip.en },
        ]),
        updatedSession,
      };
    }

    case 'ASK_GENDER': {
      if (input !== 'skip') {
        updatedSession.clientGender = input === 'male' ? 'M' : 'F';
      }
      return {
        nextState: 'ASK_CONDITIONS',
        botMessage: createBotMessage(BOT_MESSAGES.ask_conditions, [
          { id: 'dm', labelMm: RESPONSE_OPTIONS.conditions.dm.mm, labelEn: RESPONSE_OPTIONS.conditions.dm.en },
          { id: 'hiv', labelMm: RESPONSE_OPTIONS.conditions.hiv.mm, labelEn: RESPONSE_OPTIONS.conditions.hiv.en },
          { id: 'none', labelMm: RESPONSE_OPTIONS.conditions.none.mm, labelEn: RESPONSE_OPTIONS.conditions.none.en },
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
        return {
          nextState: 'REFERRAL_CHOICE',
          botMessage: createBotMessage(BOT_MESSAGES.result_presumptive, [
            { id: 'assisted', labelMm: RESPONSE_OPTIONS.referral_type.assisted.mm, labelEn: RESPONSE_OPTIONS.referral_type.assisted.en },
            { id: 'self', labelMm: RESPONSE_OPTIONS.referral_type.self.mm, labelEn: RESPONSE_OPTIONS.referral_type.self.en },
          ]),
          updatedSession,
        };
      }
      return {
        nextState: 'HEALTH_EDUCATION',
        botMessage: createBotMessage({
          mm: BOT_MESSAGES.result_not_presumptive.mm + '\n\n' + BOT_MESSAGES.health_education.mm,
          en: BOT_MESSAGES.result_not_presumptive.en + '\n\n' + BOT_MESSAGES.health_education.en,
        }, getEndOptions()),
        updatedSession: { ...updatedSession, referralType: 'None', status: 'completed' },
      };
    }

    case 'REFERRAL_CHOICE': {
      if (input === 'assisted') {
        updatedSession.referralType = 'Assisted';
        return {
          nextState: 'ASSISTED_ASK_PHONE',
          botMessage: createBotMessage(BOT_MESSAGES.assisted_referral_ask_phone),
          updatedSession,
        };
      }
      updatedSession.referralType = 'Self';
      return {
        nextState: 'SELF_ASK_TOWNSHIP',
        botMessage: createBotMessage(BOT_MESSAGES.self_referral_ask_township),
        updatedSession,
      };
    }

    case 'ASSISTED_ASK_PHONE': {
      updatedSession.clientPhone = input;
      updatedSession.status = 'completed';
      return {
        nextState: 'ASSISTED_RESULT',
        botMessage: createBotMessage(BOT_MESSAGES.assisted_referral_result, getEndOptions()),
        updatedSession,
      };
    }

    case 'SELF_ASK_TOWNSHIP': {
      updatedSession.referralTownship = input;
      return {
        nextState: 'SELF_ASK_CONTACT',
        botMessage: createBotMessage(BOT_MESSAGES.self_referral_ask_contact, [
          { id: 'skip', labelMm: BOT_MESSAGES.skip.mm, labelEn: BOT_MESSAGES.skip.en },
        ]),
        updatedSession,
      };
    }

    case 'SELF_ASK_CONTACT': {
      if (input !== 'skip') {
        updatedSession.clientPhone = input;
      }
      // The actual referral site lookup happens in the component
      // This state signals the component to fetch and display results
      updatedSession.status = 'completed';
      return {
        nextState: 'SELF_RESULT',
        botMessage: createBotMessage({ mm: '...', en: '...' }), // placeholder - replaced by component
        updatedSession,
      };
    }

    case 'AGE_UNDER_15':
    case 'DECLINE':
    case 'HEALTH_EDUCATION':
    case 'ASSISTED_RESULT':
    case 'SELF_RESULT':
    case 'END_OPTIONS': {
      if (input === 'new_screening') {
        return {
          nextState: 'WELCOME',
          botMessage: getWelcomeMessage(),
          updatedSession: createInitialSession(session.platformView),
        };
      }
      if (input === 'other_questions') {
        return {
          nextState: 'OTHER_QUESTIONS',
          botMessage: createBotMessage(BOT_MESSAGES.other_questions_placeholder, getEndOptions()),
          updatedSession,
        };
      }
      return {
        nextState: 'GOODBYE',
        botMessage: createBotMessage(BOT_MESSAGES.goodbye),
        updatedSession: { ...updatedSession, completedAt: new Date().toISOString() },
      };
    }

    case 'OTHER_QUESTIONS': {
      if (input === 'new_screening' || input === 'end') {
        return processUserInput('END_OPTIONS', input, session);
      }
      return {
        nextState: 'OTHER_QUESTIONS',
        botMessage: createBotMessage(BOT_MESSAGES.other_questions_placeholder, getEndOptions()),
        updatedSession,
      };
    }

    default:
      return {
        nextState: 'WELCOME',
        botMessage: getWelcomeMessage(),
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

function createSymptomMessage(question: typeof SYMPTOM_QUESTIONS[number]): Message {
  return {
    id: generateId(),
    sender: 'bot',
    textMm: `မေးခွန်း ${question.index}/8:\n${question.textMm}`,
    textEn: `Question ${question.index}/8:\n${question.textEn}`,
    timestamp: Date.now(),
    options: [
      { id: 'yes', labelMm: RESPONSE_OPTIONS.yes_no.yes.mm, labelEn: RESPONSE_OPTIONS.yes_no.yes.en },
      { id: 'no', labelMm: RESPONSE_OPTIONS.yes_no.no.mm, labelEn: RESPONSE_OPTIONS.yes_no.no.en },
    ],
    optionType: 'single',
  };
}

function getEndOptions(): MessageOption[] {
  return [
    { id: 'new_screening', labelMm: RESPONSE_OPTIONS.end_options.new_screening.mm, labelEn: RESPONSE_OPTIONS.end_options.new_screening.en },
    { id: 'other_questions', labelMm: RESPONSE_OPTIONS.end_options.other_questions.mm, labelEn: RESPONSE_OPTIONS.end_options.other_questions.en },
    { id: 'end', labelMm: RESPONSE_OPTIONS.end_options.end.mm, labelEn: RESPONSE_OPTIONS.end_options.end.en },
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
