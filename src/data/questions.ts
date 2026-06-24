// TB Symptom Screening Questions
// Ref: TB Control Manual for Volunteer Health Care Providers
// Ministry of Health, Department of Public Health
// National Tuberculosis Control Plan (March 2025)

export interface ScreeningQuestion {
  id: string;
  index: number;
  textEn: string;
  textMm: string;
  explanationEn: string;
  explanationMm: string;
  type: 'yes_no';
  category: 'symptom' | 'risk_factor';
}

export const SYMPTOM_QUESTIONS: ScreeningQuestion[] = [
  {
    id: 'symptom_1_cough_2wks',
    index: 1,
    textEn: 'Do you have a cough lasting more than 2 weeks?',
    textMm: 'သင့်မှာ (၂) ပတ်ကျော် ချောင်းဆိုးနေပါသလား?',
    explanationEn: 'A cough that has not gone away for more than 2 weeks — whether mild or severe — is one of the most common signs of TB. Tap "Yes" if your cough has been present for 2 weeks or longer.',
    explanationMm: '(၂) ပတ်ထက်ပိုကြာသော ချောင်းဆိုးခြင်းသည် တီဘီရောဂါ၏ အဓိကလက္ခဏာ တစ်ခု ဖြစ်ပါသည်။ သင့်ချောင်းဆိုးခြင်းသည် (၂) ပတ် သို့မဟုတ် ထို့ထက်ပိုကြာပါက "ဟုတ်ကဲ့" ကို နှိပ်ပါ။',
    type: 'yes_no',
    category: 'symptom',
  },
  {
    id: 'symptom_2_phlegm_blood',
    index: 2,
    textEn: 'Are you coughing up phlegm or blood?',
    textMm: 'သလိပ် (သို့) သွေးပါ ချောင်းဆိုးနေပါသလား?',
    explanationEn: 'When you cough, do you bring up phlegm (sputum) or blood? Coughing up blood — even a small streak — is an important TB warning sign.',
    explanationMm: 'ချောင်းဆိုးတဲ့အခါ သလိပ်(သို့)သွေး ထွက်ပါသလား? သွေး အနည်းငယ်ထွက်လျှင်ပင် တီဘီရောဂါ၏ အရေးကြီးသော သတိပေးချက် ဖြစ်ပါသည်။',
    type: 'yes_no',
    category: 'symptom',
  },
  {
    id: 'symptom_3_fever_2wks',
    index: 3,
    textEn: 'Do you have a fever lasting more than 2 weeks?',
    textMm: 'သင့်မှာ (၂) ပတ်ကျော် ဖျားနေပါသလား?',
    explanationEn: 'A fever that has not gone away for more than 2 weeks — even a low-grade or on-and-off fever — can be a sign of TB.',
    explanationMm: '(၂) ပတ်ထက်ပိုကြာသော ဖျားနာခြင်း (အပူချိန် နည်းနည်းသာရှိသော် သို့မဟုတ် တစ်ခါတစ်ရံသာဖြစ်သော် ) တီဘီရောဂါ၏ လက္ခဏာ ဖြစ်နိုင်ပါသည်။',
    type: 'yes_no',
    category: 'symptom',
  },
  {
    id: 'symptom_4_appetite_weight_loss',
    index: 4,
    textEn: 'Do you have loss of appetite or weight loss?',
    textMm: 'အစာအသောက် ပျက်ခြင်း (သို့) ကိုယ်အလေးချိန် ကျဆင်းခြင်း ရှိပါသလား?',
    explanationEn: 'Have you been eating less than usual, or lost weight without trying over the past few weeks? Unintentional weight loss is a common TB sign.',
    explanationMm: 'ပုံမှန်ထက် နည်းနည်းသာ စားသောက်နိုင်ခြင်း (သို့) ပြီးခဲ့သော ရက်သတ္တပတ်အနည်းငယ်အတွင်း ကိုယ်အလေးချိန် ကျဆင်းခြင်း ရှိပါသလား? ရည်ရွယ်ချက်မရှိဘဲ ကိုယ်အလေးချိန် ကျဆင်းခြင်းသည် တီဘီရောဂါ၏ လက္ခဏာ ဖြစ်ပါသည်။',
    type: 'yes_no',
    category: 'symptom',
  },
  {
    id: 'symptom_5_back_chest_pain',
    index: 5,
    textEn: 'Do you have back or chest pain?',
    textMm: 'ကျော (သို့) ရင်ဘတ် အောင့်ခြင်း ရှိပါသလား?',
    explanationEn: 'Persistent pain in your chest or back — especially with breathing or coughing — can be a sign of TB.',
    explanationMm: 'ရင်ဘတ်(သို့)ကျော နာကျင်ခြင်း (အထူးသဖြင့် အသက်ရှူခြင်း သို့မဟုတ် ချောင်းဆိုးခြင်းနှင့်အတူ) တီဘီရောဂါ၏ လက္ခဏာ ဖြစ်နိုင်ပါသည်။',
    type: 'yes_no',
    category: 'symptom',
  },
  {
    id: 'symptom_6_shortness_breath',
    index: 6,
    textEn: 'Do you have shortness of breath?',
    textMm: 'အသက်ရှူကြပ်ခြင်း (သို့) အသက်ရှူ မဝခြင်း ရှိပါသလား?',
    explanationEn: 'Do you feel out of breath more easily than before, or struggle to breathe? This can be a sign of TB affecting the lungs.',
    explanationMm: 'အရင်ထက် အသက်ရှူ ပိုကြပ်လာခြင်း (သို့) အသက်ရှူရခက်ခြင်း ရှိပါသလား? ၎င်းသည် တီဘီရောဂါက အဆုတ်ကို ထိခိုက်နေသည့် လက္ခဏာ ဖြစ်နိုင်ပါသည်။',
    type: 'yes_no',
    category: 'symptom',
  },
  {
    id: 'symptom_7_other_symptoms',
    index: 7,
    textEn: 'Do you have any of the following: night sweats, fatigue, or neck lump?',
    textMm: 'ညအိပ်ချိန် ချွေးစီးပန်းခြင်း၊ ပင်ပန်းနွမ်းနယ်ခြင်း (သို့) လည်ပင်းအကျိတ်ထွက်ခြင်း ရှိပါသလား?',
    explanationEn: 'Do you sweat a lot at night while sleeping, feel constantly tired even with rest, or have a lump on your neck? Any one of these can be a TB sign.',
    explanationMm: 'ည အိပ်စဉ် ချွေးအလွန်ထွက်ခြင်း၊ နားနေသော်လည်း အမြဲပင်ပန်းနေခြင်း (သို့) လည်ပင်း၌ အကျိတ်ထွက်ခြင်း — တစ်ခုခု ရှိပါက တီဘီရောဂါ၏ လက္ခဏာ ဖြစ်နိုင်ပါသည်။',
    type: 'yes_no',
    category: 'symptom',
  },
  {
    id: 'symptom_8_tb_contact',
    index: 8,
    textEn: 'Have you been in close contact with a TB patient?',
    textMm: 'တီဘီလူနာနှင့် အနီးကပ် ထိတွေ့ဆက်ဆံဖူးပါသလား?',
    explanationEn: 'In the past, have you lived with, worked closely with, or spent regular time near someone diagnosed with TB? Close contact raises your risk.',
    explanationMm: 'အတိတ်က တီဘီရောဂါရှိသူနှင့် တစ်အိမ်ထဲ နေဖူးခြင်း၊ လုပ်ငန်းခွင် တူဖူးခြင်း (သို့) နီးကပ်စွာ မှန်မှန် ထိတွေ့ဖူးပါသလား? အနီးကပ်ထိတွေ့မှုသည် တီဘီရောဂါ ဖြစ်နိုင်ခြေကို မြှင့်တင်ပါသည်။',
    type: 'yes_no',
    category: 'risk_factor',
  },
];

export const RESPONSE_OPTIONS = {
  yes_no: {
    yes: { en: 'Yes', mm: 'ဟုတ်ကဲ့' },
    no: { en: 'No', mm: 'မဟုတ်ပါ' },
  },
  gender: {
    male: { en: 'Male', mm: 'ကျား' },
    female: { en: 'Female', mm: 'မ' },
  },
  conditions: {
    dm: { en: 'Diabetes (DM)', mm: 'ဆီးချိုရောဂါ' },
    hiv: { en: 'HIV', mm: 'အိတ်ခ်ျအိုင်ဗွီ' },
    none: { en: 'None', mm: 'မရှိပါ' },
  },
  referral_type: {
    assisted: { en: 'Assisted Referral', mm: 'လမ်းညွှန်ပေးမည်' },
    self: { en: 'Self-Referral', mm: 'ကိုယ်တိုင်သွားမည်' },
  },
  start: {
    yes: { en: 'Yes, start screening', mm: 'ဟုတ်ကဲ့၊ စစ်ဆေးမည်' },
    no: { en: 'No, not now', mm: 'မဟုတ်ပါ၊ နောက်မှ' },
  },
  end_options: {
    new_screening: { en: 'New Screening', mm: 'ထပ်မံစစ်ဆေးမည်' },
    other_questions: { en: 'Other Questions', mm: 'အခြားမေးခွန်းများ' },
    end: { en: 'End Conversation', mm: 'စကားပြောရပ်မည်' },
  },
  landing: {
    choice_1: { en: '1', mm: '၁' },
    choice_2: { en: '2', mm: '၂' },
  },
  screening_action: {
    explain: { en: '❓ What does this mean?', mm: '❓ ဤမေးခွန်းကို ရှင်းပြပါ' },
    back: { en: '⬅️ Go back', mm: '⬅️ အရင်မေးခွန်းသို့' },
    exit: { en: '✖️ Exit screening', mm: '✖️ စစ်ဆေးခြင်း ရပ်ဆိုင်းမည်' },
  },
};
