// All bot messages in Burmese (primary) and English (translation panel)
// Keys here mirror the identifiers used in the Language Map Google Sheet.

export const BOT_MESSAGES = {
  // Landing — initial branching question (P1 self-check vs P3 patient info)
  landing_branching: {
    mm: 'မင်္ဂလာပါ! ကျေးဇူးပြု၍ ရွေးချယ်ပါ -\n\n(၁) တီဘီရောဂါလက္ခဏာများနှင့် ရောဂါလက္ခဏာများကို ကိုယ်တိုင်စစ်ဆေးလိုပါသလား။\n\nသို့မဟုတ်\n\n(၂) တီဘီရောဂါနှင့် ၎င်း၏ကုသမှုအချက်အလက်များအကြောင်း ပိုမိုသိရှိလိုသော တီဘီလူနာ သို့မဟုတ် တီဘီလူနာကို ပြုစုစောင့်ရှောက်သူတစ်ဦးဖြစ်ပါသလား။\n\n"၁" သို့မဟုတ် "၂" ကို နှိပ်၍ ဆက်လက်ဆောင်ရွက်ပါ။',
    en: 'Hello! Please choose:\n\n(1) Do you want to self-check for TB signs and symptoms?\n\nOr\n\n(2) Are you a TB patient or care giver of a TB patient who wants to know more about TB and its treatment info?\n\nTap "1" or "2" to continue.',
  },
  landing_choice_1_label: {
    mm: '(၁) ကိုယ်တိုင်စစ်ဆေးမည်',
    en: '(1) Self-check',
  },
  landing_choice_2_label: {
    mm: '(၂) တီဘီရောဂါ အချက်အလက်',
    en: '(2) TB patient info',
  },

  // P3 stub — adherence chatbot is not yet built
  p3_stub: {
    mm: '🙏 ကျေးဇူးတင်ပါသည်။\n\nတီဘီရောဂါ ကုသမှု၊ ဆေးသောက်ပုံ၊ ဘေးထွက်ဆိုးကျိုးများနှင့် ပြုစုစောင့်ရှောက်ခြင်းအကြောင်း မေးခွန်းများကို ဖြေဆိုပေးနိုင်သော Chatbot ကို လောလောဆယ် တည်ဆောက်နေပါသည်။\n\nအရေးတကြီး ဆေးကုသမှု လိုအပ်ပါက ကျေးဇူးပြု၍ "နေ" ဆေးခန်း၏ Tele-Health အဖွဲ့ (သို့) သင့်ကုသနေသော ဆရာဝန်/ဆရာမထံ တိုက်ရိုက် ဆက်သွယ်ပါ။',
    en: '🙏 Thank you.\n\nThe chatbot that answers questions about TB treatment, medication, side-effects and patient care is currently being built.\n\nIf you need urgent medical help, please contact the Sun Tele-Health team or your treating clinician directly.',
  },

  // Original welcome (kept for legacy; no longer the entry point)
  welcome: {
    mm: 'မင်္ဂလာပါ! တီဘီရောဂါ ကိုယ်တိုင်စစ်ဆေးခြင်း စနစ်မှ ကြိုဆိုပါသည်။\n\nဤစစ်ဆေးမှုသည် သင့်တွင် တီဘီရောဂါ လက္ခဏာများ ရှိ/မရှိ စစ်ဆေးရန် ကူညီပေးပါမည်။ စစ်ဆေးမှု စတင်လိုပါသလား?',
    en: 'Hello! Welcome to the TB Self-Screening System.\n\nThis screening will help check whether you may have symptoms of tuberculosis (TB). Would you like to start the screening?',
  },
  ask_age: {
    mm: 'ကျေးဇူးပြု၍ သင့်အသက်ကို ရေးထည့်ပါ (နှစ်):',
    en: 'Please enter your age (in years):',
  },
  age_under_15: {
    mm: 'ဤစစ်ဆေးမှုသည် အသက် ၁၅ နှစ်နှင့်အထက် လူကြီးများအတွက် ဖြစ်ပါသည်။ ကလေးများအတွက် ကျေးဇူးပြု၍ ကျန်းမာရေးဝန်ထမ်းတစ်ဦးနှင့် တိုက်ရိုက်ဆက်သွယ်ပါ။',
    en: 'This screening is designed for adults aged 15 and above. For children, please consult a healthcare provider directly.',
  },
  age_invalid: {
    mm: 'ကျေးဇူးပြု၍ မှန်ကန်သော အသက်ကို ဂဏန်းဖြင့် ရေးထည့်ပါ (ဥပမာ - ၂၅):',
    en: 'Please enter a valid age as a number (e.g., 25):',
  },
  symptom_intro: {
    mm: 'ကျေးဇူးတင်ပါသည်။ ယခု တီဘီရောဂါ လက္ခဏာများအကြောင်း မေးခွန်းအချို့ မေးပါမည်။ ကျေးဇူးပြု၍ "ဟုတ်ကဲ့" (သို့) "မဟုတ်ပါ" ဖြင့် ဖြေကြားပါ။',
    en: 'Thank you. Now I will ask you some questions about TB symptoms. Please answer "Yes" or "No" for each question.',
  },
  ask_name: {
    mm: 'ကျေးဇူးပြု၍ သင့်နာမည်ကို ရေးထည့်ပါ (မဖြေလိုပါက "ကျော်" ကို နှိပ်ပါ):',
    en: 'Please enter your name (press "Skip" if you prefer not to answer):',
  },
  ask_gender: {
    mm: 'သင့်ကျား/မ ကို ရွေးချယ်ပါ (မဖြေလိုပါက "ကျော်" ကို နှိပ်ပါ):',
    en: 'Please select your gender (press "Skip" if you prefer not to answer):',
  },
  ask_conditions: {
    mm: 'အောက်ပါ ရောဂါများထဲမှ တစ်ခုခု ရှိပါသလား? (ရွေးချယ်ပြီးလျှင် "အတည်ပြုမည်" ကို နှိပ်ပါ):',
    en: 'Do you have any of the following conditions? (Select all that apply, then press "Confirm"):',
  },
  result_presumptive: {
    mm: '⚠️ စစ်ဆေးမှုရလဒ်: တီဘီရောဂါ သံသယရှိသူ\n\nသင့်ဖြေကြားချက်များအရ တီဘီရောဂါ စစ်ဆေးမှု ပြည့်စုံစွာ ခံယူရန် လိုအပ်ပါသည်။ ကျေးဇူးပြု၍ အောက်ပါ ရွေးချယ်စရာ နှစ်ခုမှ တစ်ခုကို ရွေးပါ:',
    en: '⚠️ Screening Result: Presumptive TB\n\nBased on your responses, you need a complete TB examination. Please choose one of the following options:',
  },
  result_not_presumptive: {
    mm: '✅ စစ်ဆေးမှုရလဒ်: တီဘီရောဂါ သံသယမရှိပါ\n\nသင့်ဖြေကြားချက်များအရ လက်ရှိတွင် တီဘီရောဂါ လက္ခဏာများ မတွေ့ရှိပါ။',
    en: '✅ Screening Result: Not Presumptive TB\n\nBased on your responses, no TB symptoms were detected at this time.',
  },
  health_education: {
    mm: '📋 ကျန်းမာရေး အသိပညာပေးချက်:\n\nတီဘီရောဂါသည် လေထဲမှ ကူးစက်နိုင်သော ရောဂါဖြစ်ပါသည်။ အောက်ပါ အချက်များကို သတိပြုပါ:\n\n• ချောင်းဆိုးတဲ့အခါ ပါးစပ်ကို ဖုံးအုပ်ပါ\n• လေဝင်လေထွက် ကောင်းသော နေရာတွင် နေထိုင်ပါ\n• အာဟာရ ပြည့်ဝစွာ စားသုံးပါ\n• ပုံမှန် ကျန်းမာရေး စစ်ဆေးမှု ခံယူပါ\n• အထက်ပါ လက္ခဏာများ ပေါ်လာပါက ချက်ချင်း ဆရာဝန်နှင့် ပြသပါ\n\n[PLACEHOLDER: ဤသတင်းစကားကို ပိုမိုပြည့်စုံသော ကျန်းမာရေးပညာပေးအချက်အလက်ဖြင့် အစားထိုးရန် လိုအပ်ပါသည်]',
    en: '📋 Health Education Message:\n\nTuberculosis (TB) is an airborne infectious disease. Please keep the following in mind:\n\n• Cover your mouth when coughing\n• Stay in well-ventilated areas\n• Maintain a nutritious diet\n• Get regular health check-ups\n• If you develop any of the above symptoms, consult a doctor immediately\n\n[PLACEHOLDER: This message needs to be replaced with the official health education content]',
  },
  assisted_referral_ask_phone: {
    mm: 'ကျေးဇူးပြု၍ သင့်ဖုန်းနံပါတ် (သို့) ဆက်သွယ်ရန် အချက်အလက်ကို ရေးထည့်ပါ:',
    en: 'Please enter your phone number or contact information:',
  },
  assisted_referral_result: {
    mm: '📞 လမ်းညွှန်ပေးမှု ပြီးပါပြီ!\n\nသင့်အချက်အလက်ကို Tele-Health အဖွဲ့ထံ ပေးပို့ပြီးပါပြီ။ အဖွဲ့မှ သင့်ကို ဆက်သွယ်ပါမည်။\n\n📱 Tele-Health အဖွဲ့ ဆက်သွယ်ရန်:\nSun Community Health Tele-Health Team\nဖုန်း: [PLACEHOLDER - ဖုန်းနံပါတ်]\nအချိန်: တနင်္လာ - သောကြာ ၉:၀၀ - ၁၇:၀၀',
    en: '📞 Referral Complete!\n\nYour information has been sent to the Tele-Health team. They will contact you.\n\n📱 Tele-Health Team Contact:\nSun Community Health Tele-Health Team\nPhone: [PLACEHOLDER - phone number]\nHours: Monday - Friday 9:00 - 17:00',
  },
  self_referral_ask_township: {
    mm: 'ကျေးဇူးပြု၍ သင်နေထိုင်ရာ မြို့နယ်ကို ရေးထည့်ပါ:',
    en: 'Please enter your township (where you live):',
  },
  self_referral_ask_contact: {
    mm: 'ကျေးဇူးပြု၍ သင့် ဆက်သွယ်ရန် အချက်အလက်ကို ရေးထည့်ပါ (မဖြေလိုပါက "ကျော်" ကို နှိပ်ပါ):',
    en: 'Please enter your contact information (press "Skip" if you prefer not to answer):',
  },
  self_referral_no_match: {
    mm: '🔍 သင့်မြို့နယ်နှင့် တိုက်ရိုက်ကိုက်ညီသော တီဘီစစ်ဆေးရေးစင်တာ မတွေ့ရှိပါ။ ကျေးဇူးပြု၍ အနီးဆုံး မြို့နယ်အမည်ကို ထပ်မံရေးထည့်ပါ (သို့) "လမ်းညွှန်ပေးမည်" ကို ရွေးပါ။',
    en: '🔍 No TB screening centers found matching your township. Please try a nearby township name, or choose "Assisted Referral" instead.',
  },
  self_referral_result_header: {
    mm: '🏥 သင့်မြို့နယ်အနီးရှိ တီဘီစစ်ဆေးရေးစင်တာများ:\n',
    en: '🏥 TB Screening Centers near your township:\n',
  },
  referral_letter_header: {
    mm: '\n📄 လွှဲပြောင်းလွှာ (Referral Letter)',
    en: '\n📄 Referral Letter',
  },
  end_options: {
    mm: 'ဆက်လက်ဆောင်ရွက်လိုသည်ကို ရွေးချယ်ပါ:',
    en: 'What would you like to do next?',
  },
  other_questions_placeholder: {
    mm: '💬 ဤလုပ်ဆောင်ချက်သည် မကြာမီ အသုံးပြုနိုင်ပါမည်။ လက်ရှိတွင် တီဘီရောဂါနှင့်ပတ်သက်သော အချက်အလက်များအတွက် ကျန်းမာရေးဝန်ထမ်းတစ်ဦးနှင့် ဆက်သွယ်ပါ။',
    en: '💬 This feature will be available soon. For now, please contact a healthcare provider for any TB-related questions.',
  },
  goodbye: {
    mm: 'ကျေးဇူးတင်ပါသည်။ ကျန်းမာပါစေ! 🙏',
    en: 'Thank you. Stay healthy! 🙏',
  },
  decline_screening: {
    mm: 'မျှော်လင့်ပါသည်။ တီဘီရောဂါ စစ်ဆေးမှု ခံယူလိုသည့်အခါ ပြန်လာပါ။',
    en: 'No problem. Please come back whenever you would like to take the TB screening.',
  },
  skip: {
    mm: 'ကျော်',
    en: 'Skip',
  },
  confirm: {
    mm: 'အတည်ပြုမည်',
    en: 'Confirm',
  },
  screening_id_instruction: {
    mm: '\n\n🆔 သင့် စစ်ဆေးမှု ID: {SCREENING_ID}\nကျေးဇူးပြု၍ ဤ ID ကို Tele-Health အဖွဲ့ (သို့) တီဘီစစ်ဆေးရေးစင်တာသို့ ပေးပါ။',
    en: '\n\n🆔 Your Screening ID: {SCREENING_ID}\nPlease share this ID with the Tele-Health team or the TB screening center.',
  },

  // Per-question action buttons (added to every symptom/risk question)
  screening_action_explain: {
    mm: '❓ ဤမေးခွန်းကို ရှင်းပြပါ',
    en: '❓ What does this mean?',
  },
  screening_action_back: {
    mm: '⬅️ အရင်မေးခွန်းသို့',
    en: '⬅️ Go back',
  },
  screening_action_exit: {
    mm: '✖️ စစ်ဆေးခြင်း ရပ်ဆိုင်းမည်',
    en: '✖️ Exit screening',
  },
  screening_back_at_first: {
    mm: 'ဤသည် ပထမဆုံးမေးခွန်း ဖြစ်ပါသည်။ ဆက်လက်စစ်ဆေးရန် "ဟုတ်ကဲ့" သို့မဟုတ် "မဟုတ်ပါ" ကို နှိပ်ပါ။',
    en: 'This is the first question. Please tap "Yes" or "No" to continue, or "Exit screening" to stop.',
  },
  screening_exit_confirmation: {
    mm: 'စစ်ဆေးခြင်းကို ရပ်ဆိုင်းပါပြီ။ မည်သည့်အချိန်တွင်မဆို ပြန်လည်စတင်နိုင်ပါသည်။ ကျန်းမာပါစေ! 🙏',
    en: 'Screening has been stopped. You can restart at any time. Stay healthy! 🙏',
  },
};

