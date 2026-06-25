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

  // Empty rows (no id) — treat as zero-stage so they don't pollute the
  // outcome counts. v1.6.1 fix.
  const recordId = get('screeningReferralId') || row[0] || '';
  if (!recordId) {
    return {
      pathway: 'self-check',
      recordId: '',
      removalReason: '',
      snoozedUntil: '',
      isSnoozed: false,
      bucket: 'not-started',
      stages: [],
    };
  }

  const referralType = get('referralType');           // Assisted / Self
  const removalReason = get('removalReason');
  const snoozedUntil = get('snoozeUntil');
  const isSnoozed = isFutureDate(snoozedUntil);
  const referralCreated = parseDate(get('timestamp'));

  // Stage 1 — Tele-Health contact (Assisted only)
  const fcTelehealth = get('firstContactTelehealthDate');
  const lcTelehealth = get('lastContactTelehealthDate');
  const contactAttempts = parseInt(get('contactAttempts') || '0', 10) || 0;
  const clientContacted = get('clientContacted');
  const stage1Applicable = referralType === 'Assisted';
  const stage1PrereqMet = stage1Applicable;
  const stage1WorkStarted = contactAttempts > 0;
  const stage1Done = !!fcTelehealth || !!lcTelehealth || clientContacted === 'Yes';
  const stage1Start = referralCreated;

  // Stage 2 — Reached Screening Provider. For Assisted refs the clock
  // starts when Tele-Health completes contact (handing off the patient);
  // for Self refs it starts at referral creation.
  const fcScreening = get('firstContactScreeningProviderDate');
  const lcScreening = get('lastContactScreeningProviderDate');
  const arrived = get('arrivedAtCenter');
  const stage2PrereqMet = referralType === 'Self' || stage1Done;
  const stage2WorkStarted = false; // no partial-arrival signal — patient either arrived or didn't
  const stage2Done = !!fcScreening || !!lcScreening || arrived === 'Yes';
  const stage2Start = referralType === 'Assisted'
    ? (parseDate(fcTelehealth) || parseDate(lcTelehealth) || referralCreated)
    : referralCreated;

  // Stage 3 — CXR / Xpert results entered
  const cxrCompleted = get('cxrCompleted');
  const xpertCompleted = get('xpertCompleted');
  const cxrResult = get('cxrResult');
  const xpertResult = get('xpertResult');
  const stage3PrereqMet = stage2Done;
  const stage3Done = !!cxrResult || !!xpertResult;
  // "Tested but result not yet entered" = work in progress on this stage.
  const stage3WorkStarted = !stage3Done && (cxrCompleted === 'Yes' || xpertCompleted === 'Yes');
  const stage3Start = parseDate(fcScreening) || stage2Start;

  // Stage 4 — Patient Dx marked
  const patientDx = get('patientDx');
  const stage4PrereqMet = stage3Done;
  const stage4WorkStarted = patientDx === 'Pending';
  const stage4Done = patientDx === 'Confirmed TB +ve' || patientDx === 'Confirmed TB -ve';
  const stage4Start = stage3Start;

  // Stage 5 — Reached TB Care Provider (only if Dx = TB +ve)
  const fcCare = get('firstContactCareProviderDate');
  const lcCare = get('lastContactCareProviderDate');
  const stage5Applicable = patientDx === 'Confirmed TB +ve';
  const stage5PrereqMet = stage5Applicable;
  const stage5WorkStarted = false;
  const stage5Done = !!fcCare || !!lcCare;
  const stage5Start = stage4Start;

  const stages: StageResult[] = [
    classifyStage({
      key: 'th-contact',
      label: 'Tele-Health first contact',
      applicable: stage1Applicable,
      prereqMet: stage1PrereqMet,
      workStarted: stage1WorkStarted,
      done: stage1Done,
      startDate: stage1Start,
      isSnoozed,
    }),
    classifyStage({
      key: 'reached-sp',
      label: 'Reached TB Screening Provider',
      applicable: true,
      prereqMet: stage2PrereqMet,
      workStarted: stage2WorkStarted,
      done: stage2Done,
      startDate: stage2Start,
      isSnoozed,
    }),
    classifyStage({
      key: 'tests-resulted',
      label: 'CXR / Xpert results entered',
      applicable: true,
      prereqMet: stage3PrereqMet,
      workStarted: stage3WorkStarted,
      done: stage3Done,
      startDate: stage3Start,
      isSnoozed,
    }),
    classifyStage({
      key: 'dx-marked',
      label: 'Patient Dx marked',
      applicable: true,
      prereqMet: stage4PrereqMet,
      workStarted: stage4WorkStarted,
      done: stage4Done,
      startDate: stage4Start,
      isSnoozed,
    }),
    classifyStage({
      key: 'reached-cp',
      label: 'Reached TB Care Provider',
      applicable: stage5Applicable,
      prereqMet: stage5PrereqMet,
      workStarted: stage5WorkStarted,
      done: stage5Done,
      startDate: stage5Start,
      isSnoozed,
    }),
  ];

  return {
    pathway: 'self-check',
    recordId,
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

  // Empty/dropped rows — treat as not-applicable so they don't pollute the
  // outcome counts. A row needs at least a recordId to be a real record.
  const recordId = get('careReferralId') || row[0] || '';
  if (!recordId) {
    return {
      pathway: 'patient-support',
      recordId: '',
      removalReason: '',
      snoozedUntil: '',
      isSnoozed: false,
      bucket: 'not-started',
      stages: [],
    };
  }

  // Stage A — Tele-Health first contact. Care-side schema doesn't have an
  // explicit "first contact" date; we use status='Contacted' as the
  // primary signal, plus a captured patientContact (which only happens
  // after Tele-Health has spoken to the patient).
  const stageADone = status === 'Contacted' || status === 'In Care' || status === 'Closed' || !!patientContact;

  // Stage B — Reached care provider.
  const stageBDone = status === 'In Care' || status === 'Closed';
  const stageBStart = parseDate(followUpDate) || startDate;

  const stages: StageResult[] = [
    classifyStage({
      key: 'th-contact',
      label: 'Tele-Health first contact',
      applicable: true,
      prereqMet: true,
      workStarted: false, // no partial-contact signal on the care schema
      done: stageADone,
      startDate: startDate,
      isSnoozed,
    }),
    classifyStage({
      key: 'reached-cp',
      label: 'Reached TB Care Provider',
      applicable: true,
      prereqMet: stageADone,
      workStarted: false,
      done: stageBDone,
      startDate: stageBStart,
      isSnoozed,
    }),
  ];

  // Care Referral Log row may have an old-style status='Lost' from
  // pre-v1.6; treat that as abandoned even without removalReason.
  const abandoned = !!removalReason || status === 'Lost';

  return {
    pathway: 'patient-support',
    recordId,
    removalReason: removalReason || (status === 'Lost' ? 'lost-to-followup' : ''),
    snoozedUntil,
    isSnoozed,
    bucket: rollupBucket(stages, abandoned),
    stages,
  };
}

// ----- Helpers -----

// v1.6.1 — classify a stage with the four-signal model:
//   applicable  — does this stage apply at all? (e.g. Stage 5 only for TB+ve)
//   prereqMet   — has the previous stage completed so this one can be acted on?
//   workStarted — has anyone made an effort on this stage but not finished?
//   done        — has this stage been completed?
//
// Status mapping:
//   not-applicable: !applicable || !prereqMet (no team can act on it yet)
//   not-started:    prereqMet, no work, not done — waiting for someone
//   in-progress:    work started, not done
//   overdue:        not-started or in-progress past SLA (unless snoozed)
//   completed:      done
function classifyStage({
  key, label, applicable, prereqMet, workStarted, done, startDate, isSnoozed, noSla,
}: {
  key: string;
  label: string;
  applicable: boolean;
  prereqMet: boolean;
  workStarted: boolean;
  done: boolean;
  startDate: Date | null;
  isSnoozed: boolean;
  noSla?: boolean;
}): StageResult {
  if (!applicable || !prereqMet) return { key, label, status: 'not-applicable', ageDays: null };
  if (done) return { key, label, status: 'completed', ageDays: daysSince(startDate) };

  const days = daysSince(startDate);
  const baseStatus: StageStatus = workStarted ? 'in-progress' : 'not-started';

  if (noSla) return { key, label, status: baseStatus, ageDays: days };
  if (days != null && days > STAGE_SLA_DAYS && !isSnoozed) {
    return { key, label, status: 'overdue', ageDays: days };
  }
  return { key, label, status: baseStatus, ageDays: days };
}

// v1.6.1 — overall bucket. A row is "in-progress" not just when a stage is
// actively being worked on, but also when any earlier stage is completed
// and a later applicable stage is still open. Pure not-started means
// nothing has begun and nothing is done.
function rollupBucket(stages: StageResult[], abandoned: boolean): OverallBucket {
  if (abandoned) return 'abandoned';
  const applicable = stages.filter(s => s.status !== 'not-applicable');
  if (applicable.length === 0) return 'not-started';
  if (applicable.every(s => s.status === 'completed')) return 'completed';
  if (applicable.some(s => s.status === 'overdue')) return 'overdue';
  const hasInProgress = applicable.some(s => s.status === 'in-progress');
  const hasCompleted = applicable.some(s => s.status === 'completed');
  if (hasInProgress || hasCompleted) return 'in-progress';
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
