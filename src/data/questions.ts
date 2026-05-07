// TB Symptom Screening Questions
// Ref: TB Control Manual for Volunteer Health Care Providers
// Ministry of Health, Department of Public Health
// National Tuberculosis Control Plan (March 2025)

export interface ScreeningQuestion {
  id: string;
  index: number;
  textEn: string;
  textMm: string;
  type: 'yes_no';
  category: 'symptom' | 'risk_factor';
}

export const SYMPTOM_QUESTIONS: ScreeningQuestion[] = [
  {
    id: 'symptom_1_cough_2wks',
    index: 1,
    textEn: 'Do you have a cough lasting more than 2 weeks?',
    textMm: 'သင့်မှာ (၂) ပတ်ကျော် ချောင်းဆိုးနေပါသလား?',
    type: 'yes_no',
    category: 'symptom',
  },
  {
    id: 'symptom_2_phlegm_blood',
    index: 2,
    textEn: 'Are you coughing up phlegm or blood?',
    textMm: 'သလိပ် (သို့) သွေးပါ ချောင်းဆိုးနေပါသလား?',
    type: 'yes_no',
    category: 'symptom',
  },
  {
    id: 'symptom_3_fever_2wks',
    index: 3,
    textEn: 'Do you have a fever lasting more than 2 weeks?',
    textMm: 'သင့်မှာ (၂) ပတ်ကျော် ဖျားနေပါသလား?',
    type: 'yes_no',
    category: 'symptom',
  },
  {
    id: 'symptom_4_appetite_weight_loss',
    index: 4,
    textEn: 'Do you have loss of appetite or weight loss?',
    textMm: 'အစာအသောက် ပျက်ခြင်း (သို့) ကိုယ်အလေးချိန် ကျဆင်းခြင်း ရှိပါသလား?',
    type: 'yes_no',
    category: 'symptom',
  },
  {
    id: 'symptom_5_back_chest_pain',
    index: 5,
    textEn: 'Do you have back or chest pain?',
    textMm: 'ကျော (သို့) ရင်ဘတ် အောင့်ခြင်း ရှိပါသလား?',
    type: 'yes_no',
    category: 'symptom',
  },
  {
    id: 'symptom_6_shortness_breath',
    index: 6,
    textEn: 'Do you have shortness of breath?',
    textMm: 'အသက်ရှူကြပ်ခြင်း (သို့) အသက်ရှူ မဝခြင်း ရှိပါသလား?',
    type: 'yes_no',
    category: 'symptom',
  },
  {
    id: 'symptom_7_other_symptoms',
    index: 7,
    textEn: 'Do you have any of the following: night sweats, fatigue, or neck lump?',
    textMm: 'ညအိပ်ချိန် ချွေးစီးပန်းခြင်း၊ ပင်ပန်းနွမ်းနယ်ခြင်း (သို့) လည်ပင်းအကျိတ်ထွက်ခြင်း ရှိပါသလား?',
    type: 'yes_no',
    category: 'symptom',
  },
  {
    id: 'symptom_8_tb_contact',
    index: 8,
    textEn: 'Have you been in close contact with a TB patient?',
    textMm: 'တီဘီလူနာနှင့် အနီးကပ် ထိတွေ့ဆက်ဆံဖူးပါသလား?',
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
};
