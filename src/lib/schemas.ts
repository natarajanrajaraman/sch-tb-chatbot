// Pure schema constants — no Node.js (googleapis) imports. Safe to use
// from client components. The Sheets-writing functions in googleSheets.ts
// re-export these so server code can keep importing from a single module.

export const REFERRAL_LOG_HEADERS = [
  // A-L
  'screeningReferralId', 'conversationId', 'timestamp', 'clientName',
  'clientAge', 'clientGender', 'referralType', 'township',
  'facilityNames', 'referred', 'status', 'screeningId',
  // M-T
  'contactAttempts', 'clientContacted', 'referralGivenByTelehealth',
  'arrivedAtCenter', 'cxrCompleted', 'cxrResult',
  'xpertCompleted', 'xpertResult',
  // U-W
  'patientDx', 'tbRegistrationId', 'tbRegistrationDate',
  // X-AC
  'firstContactTelehealthDate', 'lastContactTelehealthDate',
  'firstContactScreeningProviderDate', 'lastContactScreeningProviderDate',
  'firstContactCareProviderDate', 'lastContactCareProviderDate',
  // AD-AF
  'removalReason', 'removedAt', 'snoozeUntil',
  // AG
  'remarks',
];

export const CARE_REFERRAL_LOG_HEADERS = [
  'careReferralId', 'conversationId', 'timestamp',
  'clientName', 'clientAge', 'clientGender',
  'careProviderName', 'careProviderTownship', 'careProviderContact',
  'reasonForReferral',
  'status', 'followUpDate', 'notes',
  'patientTbCaseId',
  'patientContact',
  'removalReason', 'removedAt', 'snoozeUntil',
];
