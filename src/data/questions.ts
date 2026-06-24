// TB Screening Questions — 8 symptoms + 10 risk factors
// Source of truth: SCH Q6 (NoMs 2026-06-23 "Reply to Qs on Workflow")
// Burmese phrasings are SCH-verbatim per the same NoMs.

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

// 8 symptoms per Q6 Pos definition
export const SYMPTOM_QUESTIONS: ScreeningQuestion[] = [
  {
    id: 'sym_cough_2wks',
    index: 1,
    textEn: 'Have you had a cough lasting more than 2 weeks?',
    textMm: '(၂) ပတ်ပိုပြီး ချောင်းဆိုးခြင်း ရှိပါသလား?',
    explanationEn: 'A cough that has not gone away for more than 2 weeks — mild or severe — is one of the most common signs of TB. Tap "Yes" if your cough has lasted 2 weeks or longer.',
    explanationMm: '(၂) ပတ်ထက်ပိုကြာသော ချောင်းဆိုးခြင်းသည် တီဘီရောဂါ၏ အဓိကလက္ခဏာ တစ်ခု ဖြစ်ပါသည်။ သင့်ချောင်းဆိုးခြင်းသည် (၂) ပတ် သို့မဟုတ် ထို့ထက်ပိုကြာပါက "ဟုတ်ကဲ့" ကို နှိပ်ပါ။',
    type: 'yes_no',
    category: 'symptom',
  },
  {
    id: 'sym_cough_blood_phlegm',
    index: 2,
    textEn: 'When you cough, do you bring up blood or phlegm?',
    textMm: 'ချောင်းဆိုးတဲ့အခါ သွေးပါခြင်း/သလိပ်ပါခြင်း ရှိပါသလား?',
    explanationEn: 'When you cough, do you bring up phlegm (sputum) or blood? Coughing up blood — even a small streak — is an important TB warning sign.',
    explanationMm: 'ချောင်းဆိုးတဲ့အခါ သလိပ်(သို့)သွေး ထွက်ပါသလား? သွေး အနည်းငယ်ထွက်လျှင်ပင် တီဘီရောဂါ၏ အရေးကြီးသော သတိပေးချက် ဖြစ်ပါသည်။',
    type: 'yes_no',
    category: 'symptom',
  },
  {
    id: 'sym_appetite_loss',
    index: 3,
    textEn: 'Have you had loss of appetite?',
    textMm: 'အစားအသောက်ပျက်ခြင်း ရှိပါသလား?',
    explanationEn: 'Have you been eating less than usual or losing your appetite over recent weeks? Reduced appetite can be a TB sign.',
    explanationMm: 'မကြာသေးမီရက်ပိုင်းအတွင်း ပုံမှန်ထက် နည်းနည်းသာ စားသောက်နိုင်ခြင်း သို့မဟုတ် အစားအသောက် ပျက်ခြင်း ရှိပါသလား? အစားအသောက် ပျက်ခြင်းသည် တီဘီရောဂါ၏ လက္ခဏာ ဖြစ်နိုင်ပါသည်။',
    type: 'yes_no',
    category: 'symptom',
  },
  {
    id: 'sym_weight_loss_gradual',
    index: 4,
    textEn: 'Have you been gradually losing weight?',
    textMm: 'တဖြည်းဖြည်း ပိန်လာခြင်း ရှိပါသလား?',
    explanationEn: 'Have you been losing weight gradually over weeks or months without trying? Unintentional weight loss is a common TB sign.',
    explanationMm: 'ရည်ရွယ်ချက်မရှိဘဲ ရက်သတ္တပတ်များ၊ လပိုင်းအတွင်း ကိုယ်အလေးချိန် တဖြည်းဖြည်း ကျဆင်းခြင်း ရှိပါသလား? ရည်ရွယ်ချက်မရှိဘဲ ပိန်လာခြင်းသည် တီဘီရောဂါ၏ လက္ခဏာ ဖြစ်ပါသည်။',
    type: 'yes_no',
    category: 'symptom',
  },
  {
    id: 'sym_fever_night_sweats',
    index: 5,
    textEn: 'Have you had a fever with heavy sweating at night?',
    textMm: 'ဖျားပြီး ညအခါ ချွေးအလွန်ထွက်ခြင်း ရှိပါသလား?',
    explanationEn: 'Have you had a fever combined with heavy sweating during sleep at night? This combination is a classic TB sign.',
    explanationMm: 'ဖျားနေပြီး ည အိပ်စဉ် ချွေးအလွန်အကျွံ ထွက်ခြင်း ရှိပါသလား? ၎င်းနှစ်ခု ပေါင်းစပ်နေခြင်းသည် တီဘီရောဂါ၏ ထင်ရှားသော လက္ခဏာ ဖြစ်ပါသည်။',
    type: 'yes_no',
    category: 'symptom',
  },
  {
    id: 'sym_chest_back_pain',
    index: 6,
    textEn: 'Do you have chest or back pain?',
    textMm: 'ရင်ဘတ် (သို့မဟုတ်) ကျော အောင့်ခြင်း ရှိပါသလား?',
    explanationEn: 'Persistent pain in your chest or back — especially with breathing or coughing — can be a sign of TB.',
    explanationMm: 'ရင်ဘတ်(သို့)ကျော နာကျင်ခြင်း (အထူးသဖြင့် အသက်ရှူခြင်း သို့မဟုတ် ချောင်းဆိုးခြင်းနှင့်အတူ) တီဘီရောဂါ၏ လက္ခဏာ ဖြစ်နိုင်ပါသည်။',
    type: 'yes_no',
    category: 'symptom',
  },
  {
    id: 'sym_fever_2wks',
    index: 7,
    textEn: 'Have you had a fever lasting more than 2 weeks?',
    textMm: '(၂) ပတ်ကျော်ကြာ ဖျားခြင်း ရှိပါသလား?',
    explanationEn: 'A fever — even a low-grade or on-and-off fever — that has not gone away for more than 2 weeks can be a sign of TB.',
    explanationMm: '(၂) ပတ်ထက်ပိုကြာသော ဖျားနာခြင်း (အပူချိန် နည်းနည်းသာရှိသော် သို့မဟုတ် တစ်ခါတစ်ရံသာဖြစ်သော် ) တီဘီရောဂါ၏ လက္ခဏာ ဖြစ်နိုင်ပါသည်။',
    type: 'yes_no',
    category: 'symptom',
  },
  {
    id: 'sym_other_fatigue_neck_lump',
    index: 8,
    textEn: 'Do you have other symptoms such as constant tiredness or a lump on your neck?',
    textMm: 'အခြား လက္ခဏာတွေဖြစ်တဲ့ ပင်ပန်းနွမ်းနယ်ခြင်း (သို့) လည်ပင်း အကျိတ်ထွက်ခြင်း ရှိပါသလား?',
    explanationEn: 'Do you feel constantly tired even with rest, or have a lump on your neck? Either of these can be a TB sign.',
    explanationMm: 'နားနေသော်လည်း အမြဲပင်ပန်းနေခြင်း (သို့) လည်ပင်း၌ အကျိတ်ထွက်ခြင်း — တစ်ခုခု ရှိပါက တီဘီရောဂါ၏ လက္ခဏာ ဖြစ်နိုင်ပါသည်။',
    type: 'yes_no',
    category: 'symptom',
  },
];

// 10 risk factors per Q6 Neg-high-risk definition
export const RISK_FACTOR_QUESTIONS: ScreeningQuestion[] = [
  {
    id: 'rf_tb_contact',
    index: 1,
    textEn: 'Have you been in close contact with a TB patient (e.g. living in the same household, working together)?',
    textMm: 'တီဘီလူနာနဲ့ အနီးကပ်နေခြင်း၊ ထိတွေ့ဆက်ဆံခြင်း ရှိပါသလား? (ဥပမာ။ ။ တစ်အိမ်ထဲ အတူနေခြင်း၊ လုပ်ငန်းခွင်တူခြင်း)',
    explanationEn: 'Have you lived with, worked closely with, or spent regular time near someone diagnosed with TB? Close contact raises your TB risk.',
    explanationMm: 'တီဘီရောဂါရှိသူနှင့် တစ်အိမ်ထဲ နေဖူးခြင်း၊ လုပ်ငန်းခွင် တူဖူးခြင်း (သို့) နီးကပ်စွာ မှန်မှန် ထိတွေ့ဖူးပါသလား? အနီးကပ်ထိတွေ့မှုသည် တီဘီရောဂါ ဖြစ်နိုင်ခြေကို မြှင့်တင်ပါသည်။',
    type: 'yes_no',
    category: 'risk_factor',
  },
  {
    id: 'rf_immunocompromised',
    index: 2,
    textEn: 'Are you immunocompromised (e.g. organ transplant recipient, on dialysis, HIV)?',
    textMm: 'ကိုယ်ခံအားကျဆင်းနေသူများ (ဥပမာ-ကိုယ်အင်္ဂါအစားထိုးထားသူ၊ ကျောက်ကပ်ဆေးနေရသူ) ဖြစ်ပါသလား?',
    explanationEn: 'Are you on treatment that weakens your immune system — organ transplant recipient, kidney dialysis, HIV, long-term steroids, cancer chemotherapy? A weaker immune system raises TB risk.',
    explanationMm: 'ကိုယ်ခံအား ကျဆင်းစေသော ကုသမှု ခံယူနေပါသလား — ဥပမာ ကိုယ်အင်္ဂါ အစားထိုးထားသူ၊ ကျောက်ကပ်ဆေး နေရသူ၊ အိတ်ခ်ျအိုင်ဗွီ ရှိသူ၊ ရေရှည် steroids သောက်နေသူ၊ ကင်ဆာ ဆေး ခံယူနေသူ? ကိုယ်ခံအား ကျဆင်းခြင်းသည် တီဘီရောဂါ ဖြစ်နိုင်ခြေကို မြှင့်တင်ပါသည်။',
    type: 'yes_no',
    category: 'risk_factor',
  },
  {
    id: 'rf_diabetes',
    index: 3,
    textEn: 'Do you have diabetes (high blood sugar)?',
    textMm: 'ဆီးချိုသွေးချိုရောဂါရှိသူ ဖြစ်ပါသလား?',
    explanationEn: 'Have you been diagnosed with diabetes? People with diabetes are 2-3 times more likely to develop TB.',
    explanationMm: 'ဆီးချို(သွေးချို) ရောဂါ ရှိသူ ဖြစ်ပါသလား? ဆီးချိုရှိသူများသည် တီဘီရောဂါ ဖြစ်နိုင်ခြေ ၂-၃ ဆ ပိုများပါသည်။',
    type: 'yes_no',
    category: 'risk_factor',
  },
  {
    id: 'rf_malnutrition',
    index: 4,
    textEn: 'Are you malnourished or underweight?',
    textMm: 'အာဟာရချို့တဲ့သူ ဖြစ်ပါသလား?',
    explanationEn: 'Have you been eating poorly for a long time, or are you noticeably underweight? Malnutrition weakens the body\'s defences against TB.',
    explanationMm: 'ကြာရှည်စွာ အာဟာရ မပြည့်ဝခြင်း သို့မဟုတ် ထင်ရှားစွာ ပိန်ဖျော့နေပါသလား? အာဟာရ ချို့တဲ့ခြင်းသည် တီဘီရောဂါကို ခုခံနိုင်စွမ်းကို လျှော့ချပါသည်။',
    type: 'yes_no',
    category: 'risk_factor',
  },
  {
    id: 'rf_alcohol_heavy',
    index: 5,
    textEn: 'Do you drink alcohol heavily?',
    textMm: 'အရက်အလွန်အကျွံသောက်သူ ဖြစ်ပါသလား?',
    explanationEn: 'Do you drink alcohol regularly in large amounts? Heavy drinking weakens the immune system and raises TB risk.',
    explanationMm: 'အရက်ကို မှန်မှန် အလွန်အကျွံ သောက်ပါသလား? အရက်အလွန်အကျွံ သောက်ခြင်းသည် ကိုယ်ခံအားကို ကျဆင်းစေပြီး တီဘီရောဂါ ဖြစ်နိုင်ခြေကို မြှင့်တင်ပါသည်။',
    type: 'yes_no',
    category: 'risk_factor',
  },
  {
    id: 'rf_smoking',
    index: 6,
    textEn: 'Do you smoke?',
    textMm: 'ဆေးလိပ်သောက်သူ ဖြစ်ပါသလား?',
    explanationEn: 'Do you currently smoke cigarettes, cheroots, or similar? Smoking damages the lungs and raises TB risk.',
    explanationMm: 'ဆေးလိပ် ၊ ဆေးပေါ့လိပ် တို့ကို သောက်ပါသလား? ဆေးလိပ်သောက်ခြင်းသည် အဆုတ်ကို ထိခိုက်စေပြီး တီဘီရောဂါ ဖြစ်နိုင်ခြေကို မြှင့်တင်ပါသည်။',
    type: 'yes_no',
    category: 'risk_factor',
  },
  {
    id: 'rf_age_60_plus',
    index: 7,
    textEn: 'Are you 60 years old or above?',
    textMm: 'အသက် (၆၀) နှစ်နှင့်အထက်ရှိသူ ဖြစ်ပါသလား?',
    explanationEn: 'Are you 60 years old or above? Older adults have weaker immunity and are at higher TB risk.',
    explanationMm: 'အသက် ၆၀ နှစ် နှင့်အထက် ဖြစ်ပါသလား? အသက်ကြီးသူများသည် ကိုယ်ခံအား ပိုကျဆင်းပြီး တီဘီရောဂါ ဖြစ်နိုင်ခြေ ပိုများပါသည်။',
    type: 'yes_no',
    category: 'risk_factor',
  },
  {
    id: 'rf_prior_tb',
    index: 8,
    textEn: 'Have you had TB in the past?',
    textMm: 'ယခင်က တီဘီရောဂါ ဖြစ်ဖူးသူ ဖြစ်ပါသလား?',
    explanationEn: 'Have you ever been diagnosed with TB before — at any time in your life? Past TB raises the risk of getting TB again.',
    explanationMm: 'အတိတ်က မည်သည့်အချိန်ကမဆို တီဘီရောဂါ ဖြစ်ဖူးပါသလား? အရင်က တီဘီရောဂါ ဖြစ်ဖူးခြင်းသည် နောက်တစ်ဖန် ပြန်ဖြစ်နိုင်ခြေကို မြှင့်တင်ပါသည်။',
    type: 'yes_no',
    category: 'risk_factor',
  },
  {
    id: 'rf_chronic_lung',
    index: 9,
    textEn: 'Do you have a chronic lung disease (e.g. COPD, asthma)?',
    textMm: 'နာတာရှည်အဆုတ်ရောဂါရှိသူ ဖြစ်ပါသလား?',
    explanationEn: 'Have you been diagnosed with a long-standing lung condition such as COPD, asthma, or chronic bronchitis? Chronic lung disease raises TB risk.',
    explanationMm: 'COPD၊ ပန်းနာရင်ကျပ်၊ နာတာရှည် bronchitis စသော အဆုတ်ရောဂါတစ်ခုခု ရှိပါသလား? နာတာရှည် အဆုတ်ရောဂါသည် တီဘီရောဂါ ဖြစ်နိုင်ခြေကို မြှင့်တင်ပါသည်။',
    type: 'yes_no',
    category: 'risk_factor',
  },
  {
    id: 'rf_crowded_living',
    index: 10,
    textEn: 'Do you live or work in a crowded place (e.g. dormitory, prison, factory)?',
    textMm: 'လူများထူထပ်စွာ နေထိုင်ရာ သို့မဟုတ် အလုပ်လုပ်ရာ နေရာများတွင် နေထိုင်/အလုပ်လုပ်သူ ဖြစ်ပါသလား?',
    explanationEn: 'Do you live or work in a crowded setting — dormitory, monastery, prison, factory, refugee camp — where many people share air? Crowded environments spread TB more easily.',
    explanationMm: 'အိပ်ဆောင်၊ ဘုန်းကြီးကျောင်း၊ အကျဉ်းထောင်၊ စက်ရုံ၊ ဒုက္ခသည်စခန်း — လူများသော နေရာတွင် နေထိုင်ခြင်း (သို့) အလုပ်လုပ်ခြင်း ရှိပါသလား? လူထူထပ်သော နေရာများတွင် တီဘီရောဂါ ပိုပြီး ပျံ့နှံ့လွယ်ပါသည်။',
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
  referral_type: {
    assisted: { en: 'Assisted Referral', mm: 'လမ်းညွှန်ပေးမည်' },
    self: { en: 'Self-Referral', mm: 'ကိုယ်တိုင်သွားမည်' },
  },
  consent: {
    yes: { en: 'Yes, I consent', mm: 'ဟုတ်ကဲ့၊ သဘောတူပါသည်' },
    no: { en: 'No', mm: 'မဟုတ်ပါ' },
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
  age_group: {
    under_5: { en: 'Under 5 years', mm: '၅ နှစ်အောက်' },
    pediatric: { en: '5 to 14 years', mm: '၅ မှ ၁၄ နှစ်' },
    adult: { en: '15 years or above', mm: '၁၅ နှစ်နှင့်အထက်' },
  },
  screening_action: {
    explain: { en: '❓ What does this mean?', mm: '❓ ဤမေးခွန်းကို ရှင်းပြပါ' },
    back: { en: '⬅️ Go back', mm: '⬅️ အရင်မေးခွန်းသို့' },
    exit: { en: '✖️ Exit screening', mm: '✖️ စစ်ဆေးခြင်း ရပ်ဆိုင်းမည်' },
  },
};
