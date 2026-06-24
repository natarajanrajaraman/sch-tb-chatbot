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
    mm: 'ကျေးဇူးတင်ပါသည်။ ယခု တီဘီရောဂါ လက္ခဏာများအကြောင်း မေးခွန်း (၈) ခု မေးပါမည်။ ကျေးဇူးပြု၍ "ဟုတ်ကဲ့" (သို့) "မဟုတ်ပါ" ဖြင့် ဖြေကြားပါ။',
    en: 'Thank you. Now I will ask 8 questions about TB symptoms. Please answer "Yes" or "No" for each question.',
  },
  risk_factor_intro: {
    mm: 'ကောင်းပါပြီ။ ဆက်လက်၍ တီဘီရောဂါ ဖြစ်နိုင်ခြေများသော အချက် (၁၀) ခုကို မေးပါမည်။ ကျေးဇူးပြု၍ "ဟုတ်ကဲ့" (သို့) "မဟုတ်ပါ" ဖြင့် ဖြေကြားပါ။',
    en: 'Good. Next I will ask 10 questions about TB risk factors. Please answer "Yes" or "No" for each.',
  },
  ask_name: {
    mm: 'ကျေးဇူးပြု၍ သင့်နာမည်ကို ရေးထည့်ပါ (မဖြေလိုပါက "ကျော်" ကို နှိပ်ပါ):',
    en: 'Please enter your name (press "Skip" if you prefer not to answer):',
  },
  ask_gender: {
    mm: 'သင့်ကျား/မ ကို ရွေးချယ်ပါ (မဖြေလိုပါက "ကျော်" ကို နှိပ်ပါ):',
    en: 'Please select your gender (press "Skip" if you prefer not to answer):',
  },
  // Q8 — message shown to Pos AND Neg-high-risk users (verbatim SCH copy)
  result_presumptive: {
    mm: 'တီဘီရောဂါသည် စောစောရှာဖွေတွေ့ရှိပြီး၊ စနစ်တကျ ကုသမှုခံယူလျှင်ပျောက်ကင်းနိုင်သောရောဂါ ဖြစ်ပါသည်။\n\nတီဘီရောဂါလက္ခဏာရှိသူ သို့မဟုတ် ဖြစ်နိုင်ခြေများသော အုပ်စုတွင် ပါဝင်ပါက တီဘီရောဂါရှိ/မရှိ စစ်ဆေးရန် နီးစပ်ရာ ကျန်းမာရေးဌာနများ၊ ဆေးရုံ ဆေးခန်းများ နှင့် "နေ" ဆေးခန်းများ မှ ကျန်းမာရေးဝန်ထမ်းများ နှင့် ဆရာဝန်များ ထံတွင် မေးမြန်းဆွေးနွေးနိုင်ပါသည်။\n\nနီးစပ်ရာ ကျန်းမာရေးဌာနများ၊ ဆေးရုံ ဆေးခန်းများတွင် —\n• တီဘီရောဂါလက္ခဏာများ နှင့် ဖြစ်နိုင်ခြေများသော အုပ်စုတွင် ပါဝင်ခြင်း ကို ထပ်ဆင့် အတည်ပြု စစ်မေးပေးခြင်း\n• တီဘီရောဂါ ရှိ/မရှိ ရင်ခေါင်းဓါတ်မှန်ရိုက်ကူးခြင်း\n• အကယ်၍ ရင်ခေါင်းဓါတ်မှန်အဖြေ ပုံမှန်မဟုတ်ပါက တီဘီရောဂါပိုး ရှိ/မရှိ ကွန်ပြူတာ သလိပ်စစ်ဆေးမှု ပြုလုပ်ခြင်း တို့ ပြုလုပ်ပေးပါလိမ့်မည်။\n• အကယ်၍ သလိပ်ထဲမှာ တီဘီရောဂါပိုးတွေ့လျှင် ကျန်းမာရေးဝန်ထမ်းများ မှ သင့်လျှော်သော ကုသမှု အတွက် ညွှန်ကြားခြင်း ပြုလုပ်ပေးပါမည်။\n\nကျန်းမာရေးဝန်ထမ်းများ မှ ညွှန်ကြားသည့်အတိုင်း စနစ်တကျနဲ့ ပြီးဆုံးအောင် ကုသမှုခံယူမယ် ဆိုလျှင် တီဘီရောဂါကို ပျောက်ကင်းအောင် ကုသနိုင်ပါသည်။\n\nကျေးဇူးပြု၍ အောက်ပါ နှစ်ခုထဲက တစ်ခုကို ရွေးချယ်ပါ —',
    en: 'TB is a curable disease when detected early and treated properly.\n\nIf you have TB signs/symptoms or are in a high-risk group, you can ask at nearby health centres, hospitals, clinics or Sun Clinics — their health workers and doctors will help you find out whether you have TB.\n\nAt a health centre, hospital, or clinic they will —\n• Confirm whether you have TB signs/symptoms and whether you are in a high-risk group\n• Take a chest X-ray to check for TB\n• If the chest X-ray is abnormal, do a computer-based sputum test (GeneXpert/Xpert) to check for TB bacteria\n• If TB is found, the health worker will guide you to the right treatment\n\nWith proper treatment completed in full, TB can be cured.\n\nPlease choose one of the following two options —',
  },
  result_not_presumptive: {
    mm: '✅ စစ်ဆေးမှုရလဒ်: တီဘီရောဂါ သံသယမရှိပါ\n\nသင့်ဖြေကြားချက်များအရ လက်ရှိတွင် တီဘီရောဂါ လက္ခဏာများ မတွေ့ရှိပါ။',
    en: '✅ Screening Result: Not Presumptive TB\n\nBased on your responses, no TB symptoms or risk factors were detected at this time.',
  },
  health_education: {
    mm: '📋 ကျန်းမာရေး အသိပညာပေးချက်:\n\nတီဘီရောဂါသည် လေထဲမှ ကူးစက်နိုင်သော ရောဂါဖြစ်ပါသည်။ အောက်ပါ အချက်များကို သတိပြုပါ:\n\n• ချောင်းဆိုးတဲ့အခါ ပါးစပ်ကို ဖုံးအုပ်ပါ\n• လေဝင်လေထွက် ကောင်းသော နေရာတွင် နေထိုင်ပါ\n• အာဟာရ ပြည့်ဝစွာ စားသုံးပါ\n• ပုံမှန် ကျန်းမာရေး စစ်ဆေးမှု ခံယူပါ\n• အထက်ပါ လက္ခဏာများ ပေါ်လာပါက ချက်ချင်း ဆရာဝန်နှင့် ပြသပါ\n\n[PLACEHOLDER: ဤသတင်းစကားကို ပိုမိုပြည့်စုံသော ကျန်းမာရေးပညာပေးအချက်အလက်ဖြင့် အစားထိုးရန် လိုအပ်ပါသည်]',
    en: '📋 Health Education Message:\n\nTuberculosis (TB) is an airborne infectious disease. Please keep the following in mind:\n\n• Cover your mouth when coughing\n• Stay in well-ventilated areas\n• Maintain a nutritious diet\n• Get regular health check-ups\n• If you develop any of the above symptoms, consult a doctor immediately\n\n[PLACEHOLDER: This message needs to be replaced with the official health education content]',
  },
  assisted_referral_consent: {
    mm: '"နေ" ဆေးခန်း၏ Tele-Health အဖွဲ့မှ သင့်ထံ ဖုန်းခေါ်၍ လမ်းညွှန် အကူအညီ ပေးပါမည်။\n\nဖုန်းဖြင့် ဆက်သွယ်ခြင်းခံယူရန် သဘောတူပါသလား?',
    en: 'The Sun Clinic Tele-Health team will call you to provide referral guidance.\n\nDo you consent to be contacted by phone?',
  },
  assisted_referral_no_consent: {
    mm: 'နားလည်ပါသည်။ ဖုန်းဆက်ခြင်း မလိုအပ်ပါက ကိုယ်တိုင် နီးစပ်ရာ ကျန်းမာရေးဌာန / ဆေးရုံ / "နေ" ဆေးခန်းသို့ သွားပါ။ ဆက်လက်ဆောင်ရွက်လိုသည်ကို ရွေးချယ်ပါ:',
    en: 'Understood. If you do not want to be called, please go to the nearest health centre, hospital, or Sun Clinic on your own. What would you like to do next?',
  },
  assisted_referral_ask_phone: {
    mm: 'ကျေးဇူးပြု၍ Tele-Health အဖွဲ့မှ ဆက်သွယ်နိုင်ရန် သင့်မြန်မာဖုန်းနံပါတ်ကို ရေးထည့်ပါ:',
    en: 'Please enter your Myanmar phone number so the Tele-Health team can contact you:',
  },
  assisted_referral_result: {
    mm: '📞 လမ်းညွှန်ပေးမှု ပြီးပါပြီ!\n\nသင့်အချက်အလက်ကို Tele-Health အဖွဲ့ထံ ပေးပို့ပြီးပါပြီ။ အဖွဲ့မှ သင့်ကို ဆက်သွယ်ပါမည်။\n\n📱 Tele-Health အဖွဲ့ ဆက်သွယ်ရန်:\nSun Community Health Tele-Health Team\nဖုန်း: [PLACEHOLDER - ဖုန်းနံပါတ်]\nအချိန်: တနင်္လာ - သောကြာ ၉:၀၀ - ၁၇:၀၀',
    en: '📞 Referral Complete!\n\nYour information has been sent to the Tele-Health team. They will contact you.\n\n📱 Tele-Health Team Contact:\nSun Community Health Tele-Health Team\nPhone: [PLACEHOLDER - phone number]\nHours: Monday - Friday 9:00 - 17:00',
  },
  self_referral_ask_state: {
    mm: 'ကျေးဇူးပြု၍ သင်နေထိုင်ရာ တိုင်းဒေသကြီး/ပြည်နယ် ကို ရွေးပါ:',
    en: 'Please select your State / Region:',
  },
  self_referral_ask_district: {
    mm: 'ကျေးဇူးပြု၍ ခရိုင် ကို ရွေးပါ:',
    en: 'Please select your District:',
  },
  self_referral_ask_township: {
    mm: 'ကျေးဇူးပြု၍ မြို့နယ် ကို ရွေးပါ:',
    en: 'Please select your Township:',
  },
  self_referral_no_townships_in_district: {
    mm: 'ဤခရိုင်အတွက် မြို့နယ်စာရင်း မပြုစုရသေးပါ။ ကျေးဇူးပြု၍ "ကိုယ်တိုင် ရိုက်ထည့်မည်" ကို နှိပ်၍ မြို့နယ်အမည်ကို တိုက်ရိုက် ရိုက်ထည့်ပါ။',
    en: 'No townships are listed for this district yet. Please tap "Type it in" to enter your township by hand.',
  },
  self_referral_other_township: {
    mm: '✏️ ကိုယ်တိုင် ရိုက်ထည့်မည်',
    en: '✏️ Type it in',
  },
  self_referral_ask_township_freeform: {
    mm: 'ကျေးဇူးပြု၍ သင်နေထိုင်ရာ မြို့နယ်အမည်ကို ရိုက်ထည့်ပါ:',
    en: 'Please type the name of your township:',
  },
  self_referral_ask_contact: {
    mm: 'ကျေးဇူးပြု၍ သင့် ဆက်သွယ်ရန် အချက်အလက်ကို ရေးထည့်ပါ (မဖြေလိုပါက "ကျော်" ကို နှိပ်ပါ):',
    en: 'Please enter your contact information (press "Skip" if you prefer not to answer):',
  },
  self_referral_no_match: {
    mm: '🔍 သင့်မြို့နယ်အတွက် "နေ" ဆေးခန်း ရှာမတွေ့ပါ။ ဒါပေမယ့် နီးစပ်ရာ မြို့နယ် ဆေးရုံ သို့မဟုတ် တီဘီ ဌာနသို့ သွားရောက်၍ ကုသမှု ခံယူနိုင်ပါသည်။\n\nဆက်လက်ဆောင်ရွက်လိုသည်ကို ရွေးချယ်ပါ:',
    en: '🔍 No Sun GP clinic found for your township. You can still visit the nearest township hospital or TB department for care.\n\nWhat would you like to do next?',
  },
  // Boilerplate explanation shown if user taps "What does this mean?" at the
  // Assisted-vs-Self referral choice.
  explain_referral_choice: {
    mm: '💡 လမ်းညွှန်ပေးမည် ဆိုသည်မှာ — "နေ" ဆေးခန်း၏ Tele-Health အဖွဲ့မှ သင့်ထံ ဖုန်းခေါ်၍ နီးစပ်ရာ တီဘီ စစ်ဆေးနိုင်သော နေရာသို့ လမ်းညွှန် အကူအညီ ပေးပါမည်။ ဖုန်းနံပါတ်နှင့် ဆက်သွယ်ခွင့် လိုပါသည်။\n\nကိုယ်တိုင်သွားမည် ဆိုသည်မှာ — သင်နေထိုင်ရာ နယ်/မြို့ကို ပြောပြပြီး၊ နီးစပ်ရာ ကျန်းမာရေးဌာန/ဆေးရုံ/ဆေးခန်း စာရင်းကို လက်ဆောင်ရရှိမည်။ Tele-Health မှ ဆက်သွယ်စရာ မလိုဘဲ ကိုယ်တိုင် သွားရောက် စစ်ဆေးနိုင်ပါသည်။\n\nကျေးဇူးပြု၍ ရွေးချယ်ပါ —',
    en: '💡 Assisted Referral means — the Sun Clinic Tele-Health team will call you and help guide you to a nearby place that can test for TB. We will need your phone number and your consent to be contacted.\n\nSelf-Referral means — you tell us where you live and you will receive a list of nearby health centres / hospitals / clinics, plus a referral slip. You can go on your own without anyone calling you.\n\nPlease choose one —',
  },
  explain_assisted_consent: {
    mm: '💡 "နေ" ဆေးခန်း၏ Tele-Health အဖွဲ့သည် သင်နေထိုင်ရာ မြို့နယ်အလိုက် နီးစပ်သော တီဘီ စစ်ဆေးနိုင်သော နေရာများကို သိရှိပါသည်။ သင်နှင့် ဖုန်းဖြင့် ဆက်သွယ်၍ မည်သည့်နေရာသို့ သွားရမည် နှင့် မည်သို့ ပြင်ဆင်ရမည်ကို လမ်းညွှန်ပေးပါမည်။ သင့်ဆုံးဖြတ်ချက်ကို ရွေးပါ —',
    en: '💡 The Sun Clinic Tele-Health team knows nearby TB testing locations for each township. They will phone you and guide you to where to go and how to prepare. Please choose —',
  },

  // Q17 — service-availability disclaimer in the e-referral
  referral_disclaimer: {
    mm: 'ဤလွှဲပြောင်းလွှာ (သို့) ဖန်သားပြင်ပုံကို ကျန်းမာရေးဌာန/ဆေးခန်းသို့ သွားရောက်ပြောပြပါ။\n\n⚠️ ဝန်ဆောင်မှု ရရှိနိုင်မှု နှင့် ဝန်ဆောင်ချိန်များသည် စင်တာ၏ လုပ်ငန်းအချိန်ဇယားအလိုက် ပြောင်းလဲနိုင်ပါသည်။ အချက်အလက် (သို့) အကူအညီ လိုအပ်ပါက "နေ" ဆေးခန်း Tele-Health အဖွဲ့ ဖုန်း 09-xxxx ကို ရုံးချိန်အတွင်း ဆက်သွယ်နိုင်ပါသည်။',
    en: 'Show this referral slip or screenshot at the health centre/clinic.\n\n⚠️ Service availability and operating hours may vary by centre. For information or assistance, contact the Sun Clinic Tele-Health team on 09-xxxx within office hours.',
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

