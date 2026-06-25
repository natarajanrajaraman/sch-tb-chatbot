'use client';

import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { downloadCSV } from './DataTable';
import TranscriptLink from './TranscriptLink';
import {
  computeSelfCheckJourney,
  BUCKET_LABEL,
  BUCKET_BADGE,
  REMOVAL_REASONS,
  type OverallBucket,
} from '@/lib/journeyState';

// v1.5 — Per-role editability + radio inputs + 6-date split.
// The v0.7 single-enum `outcome` column is retired (see USER-GUIDE §4.8
// "Patient journey — conceptual model"); per-stage Self-Check Outcome
// rollup ships in v1.6.

export type UserRole = 'admin' | 'telehealth' | 'screening-provider' | 'care-provider';

type FieldType = 'number' | 'radio-yesno' | 'radio' | 'date' | 'text' | 'textarea';

interface FieldConfig {
  key: string;
  label: string;
  col: number; // 0-indexed position in the row array — must match REFERRAL_LOG_HEADERS
  type: FieldType;
  options?: { value: string; label: string }[];
  // Roles that can edit this field. 'all' = every role.
  editableBy: UserRole[] | 'all';
  // Role(s) that consider this field "their" responsibility — show the
  // amber "Your action" highlight when that role is signed in.
  primaryFor?: UserRole | UserRole[];
  // For date fields: the role that gets a "Today" auto-fill button +
  // gentle prompt to stamp the date as today.
  autoStampFor?: UserRole;
  // For date fields: always offer a "stamp today" button regardless of
  // role (used for removedAt + snoozeUntil where any editor may set).
  alwaysOfferStampToday?: boolean;
  // For snoozeUntil — offer "+7d" / "+14d" quick buttons.
  offerSnoozeQuick?: boolean;
  // Conditional visibility — receives current edit values; returns false to
  // hide the field. Used for the Patient Dx → TB Registration gating.
  visibleIf?: (values: Record<string, string>) => boolean;
}

interface FieldGroup {
  title: string;
  description: string;
  fields: string[]; // keys
}

const FIELDS: FieldConfig[] = [
  // Tele-Health group — cols M-O + the 2 Tele-Health dates
  {
    key: 'contactAttempts', label: 'Contact Attempts', col: 12,
    type: 'number',
    editableBy: ['admin', 'telehealth'],
    primaryFor: 'telehealth',
  },
  {
    key: 'clientContacted', label: 'Client Contacted', col: 13,
    type: 'radio-yesno',
    editableBy: ['admin', 'telehealth'],
    primaryFor: 'telehealth',
  },
  {
    key: 'referralGivenByTelehealth', label: 'Referral Given by Tele-Health', col: 14,
    type: 'radio-yesno',
    editableBy: ['admin', 'telehealth'],
    primaryFor: 'telehealth',
  },
  {
    key: 'firstContactTelehealthDate', label: 'First Contact with Tele-Health', col: 23,
    type: 'date',
    editableBy: ['admin', 'telehealth'],
    autoStampFor: 'telehealth',
  },
  {
    key: 'lastContactTelehealthDate', label: 'Last Contact with Tele-Health', col: 24,
    type: 'date',
    editableBy: ['admin', 'telehealth'],
    autoStampFor: 'telehealth',
  },

  // Screening Provider group — arrived/CXR/Xpert + the 2 SP dates
  {
    key: 'firstContactScreeningProviderDate', label: 'First Contact with TB Screening Provider', col: 25,
    type: 'date',
    editableBy: ['admin', 'telehealth', 'screening-provider'],
    autoStampFor: 'screening-provider',
    alwaysOfferStampToday: true,
  },
  {
    key: 'lastContactScreeningProviderDate', label: 'Last Contact with TB Screening Provider', col: 26,
    type: 'date',
    editableBy: ['admin', 'telehealth', 'screening-provider'],
    autoStampFor: 'screening-provider',
    alwaysOfferStampToday: true,
  },
  {
    key: 'arrivedAtCenter', label: 'Arrived at Screening Provider', col: 15,
    type: 'radio-yesno',
    editableBy: ['admin', 'telehealth', 'screening-provider'],
    primaryFor: 'screening-provider',
  },
  {
    key: 'cxrCompleted', label: 'CXR Completed', col: 16,
    type: 'radio-yesno',
    editableBy: ['admin', 'telehealth', 'screening-provider'],
    primaryFor: 'screening-provider',
  },
  {
    key: 'cxrResult', label: 'CXR Result', col: 17,
    type: 'radio',
    options: [
      { value: '+ve', label: '+ve' },
      { value: '-ve', label: '-ve' },
      { value: 'Indeterminate', label: 'Indeterminate' },
    ],
    editableBy: ['admin', 'telehealth', 'screening-provider'],
    primaryFor: 'screening-provider',
  },
  {
    key: 'xpertCompleted', label: 'Xpert MTB/RIF Completed', col: 18,
    type: 'radio-yesno',
    editableBy: ['admin', 'telehealth', 'screening-provider'],
    primaryFor: 'screening-provider',
  },
  {
    key: 'xpertResult', label: 'Xpert MTB/RIF Result', col: 19,
    type: 'radio',
    options: [
      { value: 'T', label: 'T (TB detected)' },
      { value: 'TT', label: 'TT (trace)' },
      { value: 'RR', label: 'RR (rif-resistant)' },
      { value: 'N', label: 'N (negative)' },
      { value: 'TI', label: 'TI (invalid)' },
      { value: 'I', label: 'I (indeterminate)' },
    ],
    editableBy: ['admin', 'telehealth', 'screening-provider'],
    primaryFor: 'screening-provider',
  },

  // Final diagnosis group — anyone can mark; care provider considers
  // these fields theirs (per Raj's care-provider UX spec).
  {
    key: 'patientDx', label: 'Patient Dx', col: 20,
    type: 'radio',
    options: [
      { value: 'Confirmed TB +ve', label: 'Confirmed TB +ve' },
      { value: 'Confirmed TB -ve', label: 'Confirmed TB -ve' },
      { value: 'Indeterminate', label: 'Indeterminate' },
      { value: 'Pending', label: 'Pending' },
    ],
    editableBy: 'all',
    primaryFor: ['care-provider'],
  },
  {
    key: 'tbRegistrationId', label: 'TB Registration ID', col: 21,
    type: 'text',
    editableBy: 'all',
    primaryFor: ['care-provider'],
    visibleIf: v => v.patientDx === 'Confirmed TB +ve',
  },
  {
    key: 'tbRegistrationDate', label: 'TB Registration Date', col: 22,
    type: 'date',
    editableBy: 'all',
    primaryFor: ['care-provider'],
    visibleIf: v => v.patientDx === 'Confirmed TB +ve',
  },
  {
    key: 'careProviderReferralCompleted',
    label: 'Referral to Care Provider Completed?',
    col: 33,
    type: 'radio-yesno',
    editableBy: 'all',
    primaryFor: ['care-provider', 'telehealth'],
    visibleIf: v => v.patientDx === 'Confirmed TB +ve' || v.patientDx === 'Indeterminate',
  },

  // Care Provider group
  {
    key: 'firstContactCareProviderDate', label: 'First Contact with TB Care Provider', col: 27,
    type: 'date',
    editableBy: ['admin', 'telehealth', 'care-provider'],
    autoStampFor: 'care-provider',
    alwaysOfferStampToday: true,
  },
  {
    key: 'lastContactCareProviderDate', label: 'Last Contact with TB Care Provider', col: 28,
    type: 'date',
    editableBy: ['admin', 'telehealth', 'care-provider'],
    autoStampFor: 'care-provider',
    alwaysOfferStampToday: true,
  },

  // v1.6 — Removal + snooze (Admin + Tele-Health only). When set, these
  // change the row's overall journey-state bucket.
  {
    key: 'removalReason', label: 'Mark Abandoned (reason)', col: 29,
    type: 'radio',
    options: REMOVAL_REASONS.map(r => ({ value: r.value, label: r.label })),
    editableBy: ['admin', 'telehealth'],
  },
  {
    key: 'removedAt', label: 'Abandoned on', col: 30,
    type: 'date',
    editableBy: ['admin', 'telehealth'],
    alwaysOfferStampToday: true,
    visibleIf: v => !!v.removalReason,
  },
  {
    key: 'snoozeUntil', label: 'Snooze until (suppresses overdue)', col: 31,
    type: 'date',
    editableBy: ['admin', 'telehealth'],
    alwaysOfferStampToday: false,
    offerSnoozeQuick: true,
  },

  // Notes — anyone
  {
    key: 'remarks', label: 'Remarks', col: 32,
    type: 'textarea',
    editableBy: 'all',
  },
];

const FIELDS_BY_KEY = Object.fromEntries(FIELDS.map(f => [f.key, f]));

const GROUPS: FieldGroup[] = [
  {
    title: 'Tele-Health contact',
    description: 'Filled by the SCH Tele-Health team after they contact the patient.',
    fields: ['contactAttempts', 'clientContacted', 'referralGivenByTelehealth', 'firstContactTelehealthDate', 'lastContactTelehealthDate'],
  },
  {
    title: 'TB Screening Provider — visit and tests',
    description: 'Filled by the TB Screening Provider after the patient arrives. Tele-Health may back-fill on their behalf.',
    fields: ['firstContactScreeningProviderDate', 'lastContactScreeningProviderDate', 'arrivedAtCenter', 'cxrCompleted', 'cxrResult', 'xpertCompleted', 'xpertResult'],
  },
  {
    title: 'Final diagnosis',
    description: 'Marked by anyone reviewing the case once test results are in. TB Registration ID + Date only apply when Dx = Confirmed TB +ve. The Care Provider referral question shows when Dx is Confirmed TB +ve or Indeterminate.',
    fields: ['patientDx', 'tbRegistrationId', 'tbRegistrationDate', 'careProviderReferralCompleted'],
  },
  {
    title: 'TB Care Provider — follow-up',
    description: 'Filled by the TB Care Provider after the patient enters care. Tele-Health may back-fill on their behalf.',
    fields: ['firstContactCareProviderDate', 'lastContactCareProviderDate'],
  },
  {
    title: 'Tracking — abandon or snooze',
    description: 'Tele-Health and Admin only. "Mark Abandoned" drops the patient out of the active list with a reason. "Snooze" hides the row from the Overdue bucket until the date you pick.',
    fields: ['removalReason', 'removedAt', 'snoozeUntil'],
  },
  {
    title: 'Notes',
    description: 'Free-text notes visible to all roles.',
    fields: ['remarks'],
  },
];

// v1.6 — Bucket counts come from computeSelfCheckJourney (in journeyState.ts).
// The badge for an in-progress row that's snoozed gets the "Snoozed" affordance.
// v1.7.1 — numbered state labels per Raj's spec:
//   1a — Self-Check completed, pending Assisted Referral
//   1b — Self-Check completed, pending Self-Referral TB Screening
//   2  — Assisted Referral completed, pending TB Screening
//   3  — TB Screening Provider Reached  (awaiting Dx)
//   4  — Diagnosis NoTB, Exited          (terminal, counted as completed)
//   5  — Diagnosis TB, pending TB Care Provider
//   6  — TB Care Provider Reached
//
// Overdue prefixes the state. Snooze is appended.
function statusFor(row: string[], headers: string[]): {
  bucket: OverallBucket;
  label: string;
  isSnoozed: boolean;
} {
  const j = computeSelfCheckJourney(row, headers);
  if (j.bucket === 'abandoned') {
    return { bucket: 'abandoned', label: `Abandoned · ${j.removalReason}`, isSnoozed: false };
  }

  const findStage = (k: string) => j.stages.find(s => s.key === k);
  const thContact = findStage('th-contact');
  const reachedSp = findStage('reached-sp');
  const dxMarked = findStage('dx-marked');
  const reachedCp = findStage('reached-cp');

  const referralTypeIdx = headers.indexOf('referralType');
  const patientDxIdx = headers.indexOf('patientDx');
  const referralType = referralTypeIdx >= 0 ? (row[referralTypeIdx] || '').trim() : '';
  const patientDx = patientDxIdx >= 0 ? (row[patientDxIdx] || '').trim() : '';
  const isAssisted = referralType === 'Assisted';

  let stateLabel: string;
  let bucket: OverallBucket = j.bucket;

  if (reachedCp?.status === 'completed') {
    stateLabel = '6. TB Care Provider Reached';
    bucket = 'completed';
  } else if (dxMarked?.status === 'completed' && patientDx === 'Confirmed TB +ve') {
    stateLabel = '5. Diagnosis TB, pending TB Care Provider';
    if (bucket !== 'overdue') bucket = 'in-progress';
  } else if (dxMarked?.status === 'completed' && patientDx === 'Confirmed TB -ve') {
    stateLabel = '4. Diagnosis NoTB, Exited';
    bucket = 'completed';
  } else if (reachedSp?.status === 'completed') {
    stateLabel = '3. TB Screening Provider Reached';
    if (bucket !== 'overdue') bucket = 'in-progress';
  } else if (isAssisted && thContact?.status === 'completed') {
    stateLabel = '2. Assisted Referral completed, pending TB Screening';
    if (bucket !== 'overdue') bucket = 'in-progress';
  } else if (isAssisted) {
    stateLabel = '1a. Self-Check completed, pending Assisted Referral';
    if (bucket !== 'overdue') bucket = 'not-started';
  } else {
    stateLabel = '1b. Self-Check completed, pending Self-Referral TB Screening';
    if (bucket !== 'overdue') bucket = 'not-started';
  }

  // Overdue: prefix with the overdue stage's age
  if (bucket === 'overdue') {
    const overdueStage = j.stages.find(s => s.status === 'overdue');
    const days = overdueStage?.ageDays;
    stateLabel = `⚠ Overdue (${days != null ? days + 'd' : '?'}) · ${stateLabel}`;
  }

  // Snooze suffix
  if (j.isSnoozed) {
    stateLabel = `${stateLabel} · snoozed to ${j.snoozedUntil}`;
  }

  return { bucket, label: stateLabel, isSnoozed: j.isSnoozed };
}

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// v1.7.3 — flag when CXR=+ve or Xpert ∈ {T, TT, RR} but the Dx is set to
// something other than "Confirmed TB +ve". Returns null if consistent or if
// Dx is still pending (no contradiction yet).
function getDxDiscrepancy(v: Record<string, string>): string | null {
  const cxrPos = v.cxrResult === '+ve';
  const xpertPos = ['T', 'TT', 'RR'].includes(v.xpertResult || '');
  const testsPos = cxrPos || xpertPos;
  if (!testsPos) return null;
  if (!v.patientDx || v.patientDx === 'Pending') return null;
  if (v.patientDx === 'Confirmed TB +ve') return null;
  const cxrPart = cxrPos ? 'CXR Result = +ve' : '';
  const xpertPart = xpertPos ? `Xpert Result = ${v.xpertResult}` : '';
  const tests = [cxrPart, xpertPart].filter(Boolean).join(' and ');
  return `${tests} indicates TB, but Patient Dx is set to "${v.patientDx}". Please verify before saving.`;
}

function isEditableBy(field: FieldConfig, role: UserRole): boolean {
  return field.editableBy === 'all' || field.editableBy.includes(role);
}

// v1.7.6 — default visible columns in the row view. Anything not listed
// here is hidden by default; the user can flip it on via the Columns
// toolbar. Status + Transcript are pseudo-columns we render before the
// sheet columns and are always shown.
const DEFAULT_VISIBLE_COLUMNS = new Set([
  'screeningReferralId',
  'clientName',
  'referralType',
  'township',
  'contactAttempts',
  'clientContacted',
  'patientDx',
  'careProviderReferralCompleted',
]);

const COLUMN_VIS_LS_KEY = 'sch-screening-referral-log-cols-v1';

export default function ScreeningReferralLogTable({
  data,
  onRefresh,
  editable = true,
  userRole = 'admin',
  expandRecordId,
  onExpandHandled,
  bucketFilter,
  onClearBucketFilter,
}: {
  data: string[][];
  onRefresh: () => void;
  editable?: boolean;
  userRole?: UserRole;
  expandRecordId?: string | null;
  onExpandHandled?: () => void;
  // v1.7 — when set, filter the table to rows whose computed
  // Self-Check Outcome bucket matches.
  bucketFilter?: OverallBucket | null;
  onClearBucketFilter?: () => void;
}) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  // v1.7.3 — track the values at expand-time so we can detect unsaved changes.
  const [initialValues, setInitialValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const expandedRowRef = useRef<HTMLTableRowElement | null>(null);

  // v1.7.6 — column visibility (persisted to localStorage so it survives
  // reloads). Lazy init so SSR doesn't barf on `window`.
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set(DEFAULT_VISIBLE_COLUMNS);
    try {
      const stored = window.localStorage.getItem(COLUMN_VIS_LS_KEY);
      if (stored) return new Set(JSON.parse(stored) as string[]);
    } catch {}
    return new Set(DEFAULT_VISIBLE_COLUMNS);
  });
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const toggleColumn = (k: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      try { window.localStorage.setItem(COLUMN_VIS_LS_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  };
  const resetColumns = () => {
    setVisibleColumns(new Set(DEFAULT_VISIBLE_COLUMNS));
    try { window.localStorage.removeItem(COLUMN_VIS_LS_KEY); } catch {}
  };

  const dirty = useMemo(() => {
    const keys = new Set([...Object.keys(editValues), ...Object.keys(initialValues)]);
    for (const k of keys) {
      if ((editValues[k] || '') !== (initialValues[k] || '')) return true;
    }
    return false;
  }, [editValues, initialValues]);

  // Warn the browser before unload if there are unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const headers = data[0] || [];
  // v1.6.1 — drop empty rows (no screeningReferralId in column A). These
  // showed up as phantom "Not yet started" entries because Sheets returns
  // trailing-formatted rows even when their cells are blank.
  const allRows = useMemo(
    () => data.slice(1).filter(r => (r[0] || '').trim() !== ''),
    [data]
  );

  // Auto-expand a record when the parent (Dashboard click) sets expandRecordId.
  useEffect(() => {
    if (!expandRecordId) return;
    const idx = allRows.findIndex(r => r[0] === expandRecordId);
    if (idx >= 0) {
      setExpandedRow(idx);
      const row = allRows[idx];
      const values: Record<string, string> = {};
      FIELDS.forEach(f => { values[f.key] = row[f.col] || ''; });
      setEditValues(values);
      setInitialValues(values);
      setTimeout(() => {
        expandedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
    if (onExpandHandled) onExpandHandled();
  }, [expandRecordId, allRows, onExpandHandled]);

  if (data.length === 0) {
    return <div className="text-center py-12 text-gray-400">No screening referral log data yet.</div>;
  }

  const q = search.trim().toLowerCase();
  let rows = q
    ? allRows.filter(r =>
        (r[0] || '').toLowerCase().includes(q) ||
        (r[3] || '').toLowerCase().includes(q)
      )
    : allRows;
  if (bucketFilter) {
    rows = rows.filter(r => statusFor(r, headers).bucket === bucketFilter);
  }

  // Counters for the status banner
  const statusCounts = rows.reduce((acc, r) => {
    const s = statusFor(r, headers).bucket;
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<OverallBucket, number>);

  const handleExpand = (rowIdx: number) => {
    if (!editable) return;
    if (expandedRow === rowIdx) {
      // Collapsing the current row.
      if (dirty && !window.confirm('You have unsaved changes on this record. Discard?')) return;
      setExpandedRow(null);
      setEditValues({});
      setInitialValues({});
      return;
    }
    // Switching to a different row.
    if (expandedRow !== null && dirty && !window.confirm('You have unsaved changes on the current record. Discard and open the next?')) return;
    setExpandedRow(rowIdx);
    const row = rows[rowIdx];
    const values: Record<string, string> = {};
    FIELDS.forEach(f => { values[f.key] = row[f.col] || ''; });
    setEditValues(values);
    setInitialValues(values);
  };

  const handleSave = async (screeningReferralId: string) => {
    // v1.7.3 — confirm the user wants to save a row whose Dx is
    // inconsistent with the test results.
    const discrepancy = getDxDiscrepancy(editValues);
    if (discrepancy && !window.confirm(`⚠️ Discrepancy detected\n\n${discrepancy}\n\nClick OK to save anyway, or Cancel to fix.`)) {
      return;
    }
    setSaving(true);
    try {
      await fetch('/api/referral-log', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screeningReferralId, ...editValues }),
      });
      onRefresh();
    } catch (e) {
      console.error('Save failed:', e);
    }
    setSaving(false);
    setExpandedRow(null);
    setEditValues({});
    setInitialValues({});
  };

  const handleCancel = () => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    setExpandedRow(null);
    setEditValues({});
    setInitialValues({});
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-gray-800">
          Screening Referral Log ({rows.length}{q ? ` of ${allRows.length}` : ''} records)
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by screeningReferralId or client name"
            className="px-3 py-1.5 text-xs border rounded-md w-72 focus:ring-1 focus:ring-blue-400 outline-none"
          />
          {q && (
            <button
              onClick={() => setSearch('')}
              className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700"
              title="Clear search"
            >
              ✕
            </button>
          )}
          {/* v1.7.6 — column picker */}
          <div className="relative">
            <button
              onClick={() => setShowColumnPicker(s => !s)}
              className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs rounded-md hover:bg-slate-50"
              title="Show or hide columns"
            >
              Columns ({visibleColumns.size}/{headers.length})
            </button>
            {showColumnPicker && (
              <div className="absolute right-0 mt-1 z-30 bg-white border border-slate-200 rounded-md shadow-lg p-2 w-64 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between mb-1 pb-1 border-b">
                  <span className="text-[10px] font-semibold text-slate-600 uppercase">Columns</span>
                  <button
                    onClick={resetColumns}
                    className="text-[10px] text-blue-600 hover:underline"
                  >
                    Reset default
                  </button>
                </div>
                {headers.map(h => (
                  <label key={h} className="flex items-center gap-2 py-0.5 text-[11px] hover:bg-slate-50 px-1 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(h)}
                      onChange={() => toggleColumn(h)}
                      className="w-3 h-3"
                    />
                    <span className="font-mono text-[10px]">{h}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => downloadCSV(data, 'Screening Referral Log')}
            className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
          >
            Download CSV
          </button>
        </div>
      </div>

      {/* v1.6 Self-Check Outcome buckets — 7-day SLA per stage (pending SCH
          confirmation; see KZ-DISCUSSION-POINTS §6). */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-gray-600 font-medium">Self-Check Outcome (7-day SLA per stage):</span>
        {(['not-started', 'in-progress', 'overdue', 'completed', 'abandoned'] as OverallBucket[]).map(b => (
          <span key={b} className={`px-2 py-0.5 rounded ${BUCKET_BADGE[b]}`}>
            {BUCKET_LABEL[b]}: {statusCounts[b] || 0}
          </span>
        ))}
        {bucketFilter && (
          <span className="ml-2 px-2 py-0.5 rounded bg-blue-100 text-blue-800 flex items-center gap-1">
            Filtered: {BUCKET_LABEL[bucketFilter]}
            <button
              type="button"
              onClick={onClearBucketFilter}
              className="ml-1 text-blue-600 hover:text-blue-800"
              title="Clear filter"
            >
              ×
            </button>
          </span>
        )}
      </div>

      {editable && (
        <div className="text-xs text-gray-500 mb-2">
          Signed in as <span className="font-semibold capitalize">{userRole.replace('-', ' ')}</span>.
          Click a row to expand. Fields highlighted in <span className="px-1 rounded bg-amber-100 text-amber-800">amber</span> are your team&rsquo;s responsibility.
        </div>
      )}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto overflow-y-auto" style={{ maxHeight: '70vh' }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm">
            <tr className="border-b">
              {/* v1.7.6 — Status column is sticky-left so the badge stays
                  visible when horizontally scrolling a wide row. */}
              <th className="sticky left-0 z-30 bg-gray-50 px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">Status</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">Transcript</th>
              {headers.map((h, i) => (
                visibleColumns.has(h) && (
                  <th key={i} className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                )
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const status = statusFor(row, headers);
              return (
                <ScreeningReferralRow
                  key={i}
                  row={row}
                  headers={headers}
                  visibleColumns={visibleColumns}
                  isExpanded={expandedRow === i}
                  editable={editable}
                  userRole={userRole}
                  editValues={editValues}
                  setEditValues={setEditValues}
                  onExpand={() => handleExpand(i)}
                  onSave={() => handleSave(row[0])}
                  onCancel={handleCancel}
                  saving={saving}
                  statusLabel={status.label}
                  statusBadge={BUCKET_BADGE[status.bucket]}
                  rowRef={expandedRow === i ? expandedRowRef : undefined}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScreeningReferralRow({
  row, headers, visibleColumns, isExpanded, editable, userRole, editValues, setEditValues,
  onExpand, onSave, onCancel, saving, statusLabel, statusBadge, rowRef,
}: {
  row: string[];
  headers: string[];
  visibleColumns: Set<string>;
  isExpanded: boolean;
  editable: boolean;
  userRole: UserRole;
  editValues: Record<string, string>;
  setEditValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onExpand: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  statusLabel: string;
  statusBadge: string;
  rowRef?: React.Ref<HTMLTableRowElement>;
}) {
  // v1.6 — when Mark Abandoned is set without a date, stamp today.
  useEffect(() => {
    if (!isExpanded) return;
    if (editValues.removalReason && !editValues.removedAt) {
      setEditValues(prev => ({ ...prev, removedAt: todayISO() }));
    }
  }, [isExpanded, editValues.removalReason, editValues.removedAt, setEditValues]);

  // v1.7.3 — cxrResult set → cxrCompleted = Yes (if blank). Same for
  // firstContactScreeningProviderDate → arrivedAtCenter = Yes.
  useEffect(() => {
    if (!isExpanded) return;
    if (editValues.cxrResult && !editValues.cxrCompleted) {
      setEditValues(prev => ({ ...prev, cxrCompleted: 'Yes' }));
    }
  }, [isExpanded, editValues.cxrResult, editValues.cxrCompleted, setEditValues]);

  useEffect(() => {
    if (!isExpanded) return;
    if (editValues.xpertResult && !editValues.xpertCompleted) {
      setEditValues(prev => ({ ...prev, xpertCompleted: 'Yes' }));
    }
  }, [isExpanded, editValues.xpertResult, editValues.xpertCompleted, setEditValues]);

  useEffect(() => {
    if (!isExpanded) return;
    if (editValues.firstContactScreeningProviderDate && !editValues.arrivedAtCenter) {
      setEditValues(prev => ({ ...prev, arrivedAtCenter: 'Yes' }));
    }
  }, [isExpanded, editValues.firstContactScreeningProviderDate, editValues.arrivedAtCenter, setEditValues]);

  const dxDiscrepancy = getDxDiscrepancy(editValues);

  return (
    <>
      <tr
        ref={rowRef}
        onClick={onExpand}
        className={`border-b transition-colors ${editable ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
      >
        {/* v1.7.6 — Status cell sticks to the left edge of the scroll
            container so the badge stays visible during horizontal scroll. */}
        <td className={`sticky left-0 z-10 px-3 py-2 whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] ${isExpanded ? 'bg-blue-50' : 'bg-white'}`}>
          <span className={`px-2 py-0.5 rounded text-[10px] ${statusBadge}`}>{statusLabel}</span>
        </td>
        <td className="px-3 py-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
          <TranscriptLink conversationId={row[1] || ''} />
        </td>
        {headers.map((h, j) => (
          visibleColumns.has(h) && (
            <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate" title={row[j] || ''}>{row[j] || ''}</td>
          )
        ))}
      </tr>
      {isExpanded && (
        <tr>
          {/* v1.7 — keep the edit panel anchored to the left of the scroll
              container so it doesn't stretch with the full table width.
              v1.7.6 — colSpan widened to account for variable visible cols
              + the 2 pseudo-columns. */}
          <td colSpan={[...visibleColumns].filter(h => headers.includes(h)).length + 2} className="bg-blue-50/50 p-0">
            <div
              className="sticky left-0 px-6 py-4"
              style={{ width: 'min(1100px, calc(100vw - 140px))' }}
            >
              <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
                <div className="text-sm font-semibold text-gray-700">Edit record — {row[0]}</div>
                <div className="text-[11px] text-gray-500">
                  Highlighted fields = your team&rsquo;s responsibility · greyed out = read-only for your role
                </div>
              </div>

              {GROUPS.map(group => (
                <Fragment key={group.title}>
                  {group.title === 'Final diagnosis' && dxDiscrepancy && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-300 rounded text-xs text-red-800 flex items-start gap-2">
                      <span className="text-base leading-none">⚠️</span>
                      <span><strong>Discrepancy:</strong> {dxDiscrepancy}</span>
                    </div>
                  )}
                  <FieldGroupBlock
                    group={group}
                    userRole={userRole}
                    editValues={editValues}
                    setEditValues={setEditValues}
                  />
                </Fragment>
              ))}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save to Database'}
                </button>
                <button
                  onClick={onCancel}
                  className="px-4 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function FieldGroupBlock({ group, userRole, editValues, setEditValues }: {
  group: FieldGroup;
  userRole: UserRole;
  editValues: Record<string, string>;
  setEditValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  return (
    <div className="mb-5">
      <div className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide mb-1">{group.title}</div>
      <div className="text-[11px] text-gray-500 mb-2">{group.description}</div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        {group.fields.map(key => {
          const field = FIELDS_BY_KEY[key];
          if (!field) return null;
          if (field.visibleIf && !field.visibleIf(editValues)) return null;
          return (
            <FieldEditor
              key={field.key}
              field={field}
              userRole={userRole}
              editValues={editValues}
              setEditValues={setEditValues}
            />
          );
        })}
      </div>
    </div>
  );
}

function FieldEditor({ field, userRole, editValues, setEditValues }: {
  field: FieldConfig;
  userRole: UserRole;
  editValues: Record<string, string>;
  setEditValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const canEdit = isEditableBy(field, userRole);
  const primaryMatch = Array.isArray(field.primaryFor)
    ? field.primaryFor.includes(userRole)
    : field.primaryFor === userRole;
  const isYourResponsibility = primaryMatch || field.autoStampFor === userRole;
  // v1.7.6 — compact wrapper for short fields; wide for textarea + many-option radios.
  const wrapperClass =
    field.type === 'textarea' ? '[grid-column:1/-1]' :
    field.type === 'radio' && (field.options?.length || 0) > 3 ? '[grid-column:span_2]' : '';

  const value = editValues[field.key] || '';
  const setValue = (v: string) => setEditValues(prev => ({ ...prev, [field.key]: v }));
  const stampToday = () => setValue(todayISO());
  const stampDaysFromNow = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    setValue(d.toISOString().slice(0, 10));
  };

  const showStampToday =
    canEdit &&
    (field.autoStampFor === userRole || field.alwaysOfferStampToday);

  // Border + bg cues
  const ring =
    isYourResponsibility && canEdit
      ? 'ring-2 ring-amber-300 bg-amber-50/50'
      : canEdit
      ? 'bg-white'
      : 'bg-gray-100 opacity-70';

  return (
    <div className={`${wrapperClass} rounded-md border border-gray-200 ${ring} p-2`}>
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <label className="block text-[10px] font-medium text-gray-600 uppercase mb-1">{field.label}</label>
        {!canEdit && (
          <span className="text-[9px] text-gray-400 italic">read-only for your role</span>
        )}
        <div className="flex items-center gap-2">
          {showStampToday && (
            <button
              type="button"
              onClick={stampToday}
              className="text-[9px] text-blue-600 hover:text-blue-800 underline"
            >
              stamp today
            </button>
          )}
          {field.offerSnoozeQuick && canEdit && (
            <>
              <button
                type="button"
                onClick={() => stampDaysFromNow(7)}
                className="text-[9px] text-blue-600 hover:text-blue-800 underline"
              >
                +7d
              </button>
              <button
                type="button"
                onClick={() => stampDaysFromNow(14)}
                className="text-[9px] text-blue-600 hover:text-blue-800 underline"
              >
                +14d
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => setValue('')}
                  className="text-[9px] text-gray-400 hover:text-gray-600 underline"
                >
                  clear
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {field.type === 'number' && (
        <input
          type="number"
          min="0"
          disabled={!canEdit}
          value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full max-w-[140px] px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none disabled:bg-transparent disabled:cursor-not-allowed"
        />
      )}
      {field.type === 'text' && (
        <input
          type="text"
          disabled={!canEdit}
          value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full max-w-sm px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none disabled:bg-transparent disabled:cursor-not-allowed"
        />
      )}
      {field.type === 'textarea' && (
        <textarea
          rows={3}
          disabled={!canEdit}
          value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full max-w-3xl px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none disabled:bg-transparent disabled:cursor-not-allowed"
        />
      )}
      {field.type === 'date' && (
        <input
          type="date"
          disabled={!canEdit}
          value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full max-w-[180px] px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none disabled:bg-transparent disabled:cursor-not-allowed"
        />
      )}
      {field.type === 'radio-yesno' && (
        <RadioGroup
          name={field.key}
          value={value}
          disabled={!canEdit}
          options={[
            { value: 'Yes', label: 'Yes' },
            { value: 'No', label: 'No' },
          ]}
          onChange={setValue}
          allowClear
        />
      )}
      {field.type === 'radio' && (
        <RadioGroup
          name={field.key}
          value={value}
          disabled={!canEdit}
          options={field.options || []}
          onChange={setValue}
          allowClear
        />
      )}
    </div>
  );
}

function RadioGroup({ name, value, options, disabled, onChange, allowClear }: {
  name: string;
  value: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (v: string) => void;
  allowClear?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-1">
      {options.map(opt => (
        <label key={opt.value} className={`flex items-center gap-1.5 text-[11px] ${disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-800 cursor-pointer'}`}>
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            disabled={disabled}
            onChange={() => onChange(opt.value)}
            className="w-3 h-3"
          />
          <span>{opt.label}</span>
        </label>
      ))}
      {allowClear && value && !disabled && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-[10px] text-gray-400 hover:text-gray-600 underline"
        >
          clear
        </button>
      )}
    </div>
  );
}
