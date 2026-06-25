// v1.6 — Journey-state computation for both prototype pathways.
//
// Two pathways, each with its own stage list:
//   - Self-Check (Screening Referral Log)
//   - Patient Support (Care Referral Log)
//
// Each row resolves to:
//   - per-stage StageStatus (not-applicable / not-started / in-progress / overdue / completed)
//   - overall OverallBucket (not-started / in-progress / overdue / completed / abandoned)
//
// SLA = 7 days per stage. snoozeUntil suppresses overdue while it's in
// the future. removalReason → bucket = abandoned (regardless of stage).
//
// Pure functions only — no I/O. UI calls these against rows already loaded.

import { REFERRAL_LOG_HEADERS, CARE_REFERRAL_LOG_HEADERS } from './schemas';

export type StageStatus =
  | 'not-applicable'
  | 'not-started'
  | 'in-progress'
  | 'overdue'
  | 'completed';

export type OverallBucket =
  | 'not-started'
  | 'in-progress'
  | 'overdue'
  | 'completed'
  | 'abandoned';

export interface StageResult {
  key: string;
  label: string;
  status: StageStatus;
  // Days the stage has been open (since its start signal), if applicable.
  ageDays: number | null;
}

export interface JourneyState {
  pathway: 'self-check' | 'patient-support';
  recordId: string;
  removalReason: string;
  snoozedUntil: string;
  isSnoozed: boolean;
  bucket: OverallBucket;
  stages: StageResult[];
}

export const STAGE_SLA_DAYS = 7;

const MS_PER_DAY = 86_400_000;

function colIndex(headers: string[], name: string): number {
  return headers.findIndex(h => h === name);
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function daysSince(d: Date | null): number | null {
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / MS_PER_DAY);
}

function isFutureDate(s: string): boolean {
  const d = parseDate(s);
  if (!d) return false;
  return d.getTime() > Date.now();
}

// ----- Self-Check pathway (Screening Referral Log) -----
//
// Stages (per USER-GUIDE §4.6):
//   1. Tele-Health first contact   (Assisted refs only; SLA 7d after row creation)
//   2. Reached TB Screening Provider (SLA 7d after stage 1 done — or row creation for self refs)
//   3. CXR / Xpert results entered (SLA 7d after stage 2 done)
//   4. Patient Dx marked           (no SLA — done when results in)
//   5. Reached TB Care Provider    (only if Dx = Confirmed TB +ve; SLA 7d after dx)

export function computeSelfCheckJourney(row: string[], headers: string[] = REFERRAL_LOG_HEADERS): JourneyState {
  const get = (name: string) => (row[colIndex(headers, name)] || '').trim();

  const referralType = get('referralType');           // Assisted / Self
  const removalReason = get('removalReason');
  const snoozedUntil = get('snoozeUntil');
  const isSnoozed = isFutureDate(snoozedUntil);

  // Stage 1 signals — Tele-Health contact
  const fcTelehealth = get('firstContactTelehealthDate');
  const lcTelehealth = get('lastContactTelehealthDate');
  const contactAttempts = parseInt(get('contactAttempts') || '0', 10) || 0;
  const clientContacted = get('clientContacted');
  const stage1Done = !!fcTelehealth || !!lcTelehealth || clientContacted === 'Yes' || contactAttempts > 0;
  const stage1StartDate = parseDate(get('timestamp'));

  // Stage 2 signals — Reached Screening Provider
  const fcScreening = get('firstContactScreeningProviderDate');
  const lcScreening = get('lastContactScreeningProviderDate');
  const arrived = get('arrivedAtCenter');
  const stage2Done = !!fcScreening || !!lcScreening || arrived === 'Yes';
  const stage2StartDate =
    referralType === 'Assisted'
      ? (parseDate(fcTelehealth) || parseDate(lcTelehealth) || stage1StartDate)
      : stage1StartDate;

  // Stage 3 signals — CXR / Xpert results entered
  const cxrResult = get('cxrResult');
  const xpertResult = get('xpertResult');
  const stage3Done = !!cxrResult || !!xpertResult;
  const stage3StartDate = parseDate(fcScreening) || stage2StartDate;

  // Stage 4 signals — Patient Dx marked
  const patientDx = get('patientDx');
  const stage4Done = patientDx === 'Confirmed TB +ve' || patientDx === 'Confirmed TB -ve';

  // Stage 5 — Reached TB Care Provider (only if Dx = TB +ve)
  const fcCare = get('firstContactCareProviderDate');
  const lcCare = get('lastContactCareProviderDate');
  const stage5Applicable = patientDx === 'Confirmed TB +ve';
  const stage5Done = !!fcCare || !!lcCare;
  const stage5StartDate = parseDate(fcScreening) || stage3StartDate;

  const stages: StageResult[] = [
    classifyStage({
      key: 'th-contact',
      label: 'Tele-Health first contact',
      applicable: referralType === 'Assisted',
      done: stage1Done,
      startDate: stage1StartDate,
      isSnoozed,
    }),
    classifyStage({
      key: 'reached-sp',
      label: 'Reached TB Screening Provider',
      applicable: true,
      done: stage2Done,
      startDate: stage2StartDate,
      isSnoozed,
    }),
    classifyStage({
      key: 'tests-resulted',
      label: 'CXR / Xpert results entered',
      applicable: stage2Done, // can't enter results before patient arrives
      done: stage3Done,
      startDate: stage3StartDate,
      isSnoozed,
    }),
    classifyStage({
      key: 'dx-marked',
      label: 'Patient Dx marked',
      applicable: stage3Done, // can't mark dx without results
      done: stage4Done,
      // Dx has no SLA — just pending vs done
      startDate: null,
      isSnoozed,
      noSla: true,
    }),
    classifyStage({
      key: 'reached-cp',
      label: 'Reached TB Care Provider',
      applicable: stage5Applicable,
      done: stage5Done,
      startDate: stage5StartDate,
      isSnoozed,
    }),
  ];

  return {
    pathway: 'self-check',
    recordId: get('screeningReferralId') || row[0] || '',
    removalReason,
    snoozedUntil,
    isSnoozed,
    bucket: rollupBucket(stages, !!removalReason),
    stages,
  };
}

// ----- Patient Support pathway (Care Referral Log) -----
//
// Stages (per USER-GUIDE §4.6):
//   A. Tele-Health first contact (SLA 7d normal; <24h escalation=immediate)
//   B. Reached TB Care Provider  (SLA 7d after stage A done)

export function computePatientSupportJourney(row: string[], headers: string[] = CARE_REFERRAL_LOG_HEADERS): JourneyState {
  const get = (name: string) => (row[colIndex(headers, name)] || '').trim();

  const status = get('status');
  const followUpDate = get('followUpDate');
  const patientContact = get('patientContact');
  const removalReason = get('removalReason');
  const snoozedUntil = get('snoozeUntil');
  const isSnoozed = isFutureDate(snoozedUntil);
  const startDate = parseDate(get('timestamp'));

  // Stage A — Tele-Health first contact. Care-side schema doesn't have an
  // explicit "first contact" date; we use status='Contacted' as the
  // primary signal, plus a captured patientContact (which only happens
  // after Tele-Health has spoken to the patient).
  const stageADone = status === 'Contacted' || status === 'In Care' || status === 'Closed' || !!patientContact;
  const stageAStartDate = startDate;

  // Stage B — Reached care provider.
  const stageBDone = status === 'In Care' || status === 'Closed';
  const stageBStartDate = parseDate(followUpDate) || stageAStartDate;

  const stages: StageResult[] = [
    classifyStage({
      key: 'th-contact',
      label: 'Tele-Health first contact',
      applicable: true,
      done: stageADone,
      startDate: stageAStartDate,
      isSnoozed,
    }),
    classifyStage({
      key: 'reached-cp',
      label: 'Reached TB Care Provider',
      applicable: stageADone,
      done: stageBDone,
      startDate: stageBStartDate,
      isSnoozed,
    }),
  ];

  // Care Referral Log row may have an old-style status='Lost' from
  // pre-v1.6; treat that as abandoned even without removalReason.
  const abandoned = !!removalReason || status === 'Lost';

  return {
    pathway: 'patient-support',
    recordId: get('careReferralId') || row[0] || '',
    removalReason: removalReason || (status === 'Lost' ? 'lost-to-followup' : ''),
    snoozedUntil,
    isSnoozed,
    bucket: rollupBucket(stages, abandoned),
    stages,
  };
}

// ----- Helpers -----

function classifyStage({
  key, label, applicable, done, startDate, isSnoozed, noSla,
}: {
  key: string;
  label: string;
  applicable: boolean;
  done: boolean;
  startDate: Date | null;
  isSnoozed: boolean;
  noSla?: boolean;
}): StageResult {
  if (!applicable) return { key, label, status: 'not-applicable', ageDays: null };
  if (done) return { key, label, status: 'completed', ageDays: daysSince(startDate) };
  if (!startDate) return { key, label, status: 'not-started', ageDays: null };

  const days = daysSince(startDate);
  // Stage is in progress once its start signal is set. Overdue if past SLA.
  if (noSla) return { key, label, status: 'in-progress', ageDays: days };
  if (days != null && days > STAGE_SLA_DAYS && !isSnoozed) {
    return { key, label, status: 'overdue', ageDays: days };
  }
  return { key, label, status: 'in-progress', ageDays: days };
}

function rollupBucket(stages: StageResult[], abandoned: boolean): OverallBucket {
  if (abandoned) return 'abandoned';
  const applicable = stages.filter(s => s.status !== 'not-applicable');
  if (applicable.every(s => s.status === 'completed')) return 'completed';
  if (applicable.some(s => s.status === 'overdue')) return 'overdue';
  if (applicable.some(s => s.status === 'in-progress')) return 'in-progress';
  return 'not-started';
}

// ----- Bucket display -----

export const BUCKET_LABEL: Record<OverallBucket, string> = {
  'not-started': 'Not yet started',
  'in-progress': 'In progress',
  'overdue': 'Overdue',
  'completed': 'Completed',
  'abandoned': 'Abandoned',
};

export const BUCKET_BADGE: Record<OverallBucket, string> = {
  'not-started': 'bg-gray-200 text-gray-700',
  'in-progress': 'bg-blue-100 text-blue-800',
  'overdue': 'bg-red-100 text-red-800 font-semibold',
  'completed': 'bg-emerald-100 text-emerald-800',
  'abandoned': 'bg-gray-100 text-gray-600',
};

export const BUCKET_BORDER: Record<OverallBucket, string> = {
  'not-started': 'border-gray-400',
  'in-progress': 'border-blue-400',
  'overdue': 'border-red-500',
  'completed': 'border-emerald-500',
  'abandoned': 'border-gray-400',
};

export const STAGE_STATUS_BADGE: Record<StageStatus, string> = {
  'not-applicable': 'bg-gray-50 text-gray-400 italic',
  'not-started': 'bg-gray-100 text-gray-600',
  'in-progress': 'bg-blue-100 text-blue-800',
  'overdue': 'bg-red-100 text-red-800 font-semibold',
  'completed': 'bg-emerald-100 text-emerald-800',
};

export const REMOVAL_REASONS = [
  { value: 'lost-to-followup', label: 'Lost to follow-up' },
  { value: 'declined-screening', label: 'Declined screening' },
  { value: 'declined-care', label: 'Declined care' },
  { value: 'moved-away', label: 'Moved away' },
  { value: 'deceased', label: 'Deceased' },
  { value: 'other', label: 'Other' },
] as const;
