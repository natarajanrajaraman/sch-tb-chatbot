// Placeholder hierarchy of Myanmar locations for the self-referral cascade.
// Schema: state_region_en | state_region_mm | district_en | district_mm | township_en | township_mm
//
// TODO: REPLACE WITH SCH'S AUTHORITATIVE DIRECTORY (Q14, Q16).
// SCH will provide (i) the TB service directory of NTP (with NTP approval)
// and (ii) Sun GP with TB service directory. Each row in the eventual file
// should also carry a Sun-GP / NTP-service-availability flag so we can
// filter clinics that actually offer TB testing. Until then, this small
// placeholder set is enough to exercise the cascading UI.

import type { LocationEntry } from '@/lib/locationRegistry';

export const LOCATION_SEED: LocationEntry[] = [
  // Yangon Region
  { stateRegionEn: 'Yangon Region',    stateRegionMm: 'ရန်ကုန်တိုင်းဒေသကြီး',  districtEn: 'Yangon East District',  districtMm: 'ရန်ကုန်အရှေ့ပိုင်းခရိုင်',  townshipEn: 'Bahan',         townshipMm: 'ဗဟန်း' },
  { stateRegionEn: 'Yangon Region',    stateRegionMm: 'ရန်ကုန်တိုင်းဒေသကြီး',  districtEn: 'Yangon East District',  districtMm: 'ရန်ကုန်အရှေ့ပိုင်းခရိုင်',  townshipEn: 'Tamwe',         townshipMm: 'တာမွေ' },
  { stateRegionEn: 'Yangon Region',    stateRegionMm: 'ရန်ကုန်တိုင်းဒေသကြီး',  districtEn: 'Yangon East District',  districtMm: 'ရန်ကုန်အရှေ့ပိုင်းခရိုင်',  townshipEn: 'Yankin',        townshipMm: 'ရန်ကင်း' },
  { stateRegionEn: 'Yangon Region',    stateRegionMm: 'ရန်ကုန်တိုင်းဒေသကြီး',  districtEn: 'Yangon West District',  districtMm: 'ရန်ကုန်အနောက်ပိုင်းခရိုင်', townshipEn: 'Kyimyindaing',  townshipMm: 'ကြည့်မြင်တိုင်' },
  { stateRegionEn: 'Yangon Region',    stateRegionMm: 'ရန်ကုန်တိုင်းဒေသကြီး',  districtEn: 'Yangon West District',  districtMm: 'ရန်ကုန်အနောက်ပိုင်းခရိုင်', townshipEn: 'Sanchaung',     townshipMm: 'စမ်းချောင်း' },
  { stateRegionEn: 'Yangon Region',    stateRegionMm: 'ရန်ကုန်တိုင်းဒေသကြီး',  districtEn: 'Yangon North District', districtMm: 'ရန်ကုန်မြောက်ပိုင်းခရိုင်',  townshipEn: 'Insein',        townshipMm: 'အင်းစိန်' },
  { stateRegionEn: 'Yangon Region',    stateRegionMm: 'ရန်ကုန်တိုင်းဒေသကြီး',  districtEn: 'Yangon North District', districtMm: 'ရန်ကုန်မြောက်ပိုင်းခရိုင်',  townshipEn: 'Mayangone',     townshipMm: 'မရမ်းကုန်း' },
  { stateRegionEn: 'Yangon Region',    stateRegionMm: 'ရန်ကုန်တိုင်းဒေသကြီး',  districtEn: 'Yangon South District', districtMm: 'ရန်ကုန်တောင်ပိုင်းခရိုင်',   townshipEn: 'Thaketa',       townshipMm: 'သာကေတ' },
  { stateRegionEn: 'Yangon Region',    stateRegionMm: 'ရန်ကုန်တိုင်းဒေသကြီး',  districtEn: 'Yangon South District', districtMm: 'ရန်ကုန်တောင်ပိုင်းခရိုင်',   townshipEn: 'Dawbon',        townshipMm: 'ဒေါပုံ' },

  // Mandalay Region
  { stateRegionEn: 'Mandalay Region',  stateRegionMm: 'မန္တလေးတိုင်းဒေသကြီး', districtEn: 'Mandalay District',     districtMm: 'မန္တလေးခရိုင်',           townshipEn: 'Chan Aye Tha Zan', townshipMm: 'ချမ်းအေးသာဇံ' },
  { stateRegionEn: 'Mandalay Region',  stateRegionMm: 'မန္တလေးတိုင်းဒေသကြီး', districtEn: 'Mandalay District',     districtMm: 'မန္တလေးခရိုင်',           townshipEn: 'Chan Mya Tha Zi',  townshipMm: 'ချမ်းမြသာစည်' },
  { stateRegionEn: 'Mandalay Region',  stateRegionMm: 'မန္တလေးတိုင်းဒေသကြီး', districtEn: 'Mandalay District',     districtMm: 'မန္တလေးခရိုင်',           townshipEn: 'Aung Myay Tha Zan',townshipMm: 'အောင်မြေသာစံ' },
  { stateRegionEn: 'Mandalay Region',  stateRegionMm: 'မန္တလေးတိုင်းဒေသကြီး', districtEn: 'Mandalay District',     districtMm: 'မန္တလေးခရိုင်',           townshipEn: 'Mahar Aung Myay', townshipMm: 'မဟာအောင်မြေ' },
  { stateRegionEn: 'Mandalay Region',  stateRegionMm: 'မန္တလေးတိုင်းဒေသကြီး', districtEn: 'Pyin Oo Lwin District', districtMm: 'ပြင်ဦးလွင်ခရိုင်',         townshipEn: 'Pyin Oo Lwin',  townshipMm: 'ပြင်ဦးလွင်' },

  // Bago Region
  { stateRegionEn: 'Bago Region',      stateRegionMm: 'ပဲခူးတိုင်းဒေသကြီး',    districtEn: 'Bago District',         districtMm: 'ပဲခူးခရိုင်',               townshipEn: 'Bago',          townshipMm: 'ပဲခူး' },
  { stateRegionEn: 'Bago Region',      stateRegionMm: 'ပဲခူးတိုင်းဒေသကြီး',    districtEn: 'Pyay District',         districtMm: 'ပြည်ခရိုင်',                townshipEn: 'Pyay',          townshipMm: 'ပြည်' },

  // Sagaing Region
  { stateRegionEn: 'Sagaing Region',   stateRegionMm: 'စစ်ကိုင်းတိုင်းဒေသကြီး', districtEn: 'Sagaing District',      districtMm: 'စစ်ကိုင်းခရိုင်',           townshipEn: 'Sagaing',       townshipMm: 'စစ်ကိုင်း' },
  { stateRegionEn: 'Sagaing Region',   stateRegionMm: 'စစ်ကိုင်းတိုင်းဒေသကြီး', districtEn: 'Monywa District',       districtMm: 'မုံရွာခရိုင်',              townshipEn: 'Monywa',        townshipMm: 'မုံရွာ' },

  // Ayeyarwady Region
  { stateRegionEn: 'Ayeyarwady Region',stateRegionMm: 'ဧရာဝတီတိုင်းဒေသကြီး',   districtEn: 'Pathein District',      districtMm: 'ပုသိမ်ခရိုင်',              townshipEn: 'Pathein',       townshipMm: 'ပုသိမ်' },
];
