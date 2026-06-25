'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
  // Role that considers this field "their" responsibility — shows the
  // "Your action" highlight when that role is signed in.
  primaryFor?: UserRole;
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
  },
  {
    key: 'lastContactScreeningProviderDate', label: 'Last Contact with TB Screening Provider', col: 26,
    type: 'date',
    editableBy: ['admin', 'telehealth', 'screening-provider'],
    autoStampFor: 'screening-provider',
  },
  {
    key: 'arrivedAtCenter', label: 'Arrived at Screening Centre', col: 15,
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

  // Final diagnosis group — anyone can mark
  {
    key: 'patientDx', label: 'Patient Dx', col: 20,
    type: 'radio',
    options: [
      { value: 'Confirmed TB +ve', label: 'Confirmed TB +ve' },
      { value: 'Confirmed TB -ve', label: 'Confirmed TB -ve' },
      { value: 'Pending', label: 'Pending' },
    ],
    editableBy: 'all',
  },
  {
    key: 'tbRegistrationId', label: 'TB Registration ID', col: 21,
    type: 'text',
    editableBy: 'all',
    visibleIf: v => v.patientDx === 'Confirmed TB +ve',
  },
  {
    key: 'tbRegistrationDate', label: 'TB Registration Date', col: 22,
    type: 'date',
    editableBy: 'all',
    visibleIf: v => v.patientDx === 'Confirmed TB +ve',
  },

  // Care Provider group
  {
    key: 'firstContactCareProviderDate', label: 'First Contact with TB Care Provider', col: 27,
    type: 'date',
    editableBy: ['admin', 'telehealth', 'care-provider'],
    autoStampFor: 'care-provider',
  },
  {
    key: 'lastContactCareProviderDate', label: 'Last Contact with TB Care Provider', col: 28,
    type: 'date',
    editableBy: ['admin', 'telehealth', 'care-provider'],
    autoStampFor: 'care-provider',
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
    description: 'Marked by anyone reviewing the case once test results are in. TB Registration ID + Date only apply when Dx = Confirmed TB +ve.',
    fields: ['patientDx', 'tbRegistrationId', 'tbRegistrationDate'],
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
function statusFor(row: string[], headers: string[]): {
  bucket: OverallBucket;
  label: string;
  isSnoozed: boolean;
} {
  const j = computeSelfCheckJourney(row, headers);
  // Highlight the most-recent overdue stage in the label if applicable.
  const overdueStage = j.stages.find(s => s.status === 'overdue');
  const inProgressStage = j.stages.find(s => s.status === 'in-progress');
  if (j.bucket === 'abandoned') {
    return { bucket: 'abandoned', label: `Abandoned · ${j.removalReason}`, isSnoozed: false };
  }
  if (j.bucket === 'completed') {
    return { bucket: 'completed', label: 'Pathway complete', isSnoozed: false };
  }
  if (j.bucket === 'overdue' && overdueStage) {
    const days = overdueStage.ageDays ?? '?';
    return { bucket: 'overdue', label: `Overdue · ${overdueStage.label} (${days}d)`, isSnoozed: false };
  }
  if (j.bucket === 'in-progress' && inProgressStage) {
    const suffix = j.isSnoozed ? ` · snoozed to ${j.snoozedUntil}` : '';
    return { bucket: 'in-progress', label: `${inProgressStage.label}${suffix}`, isSnoozed: j.isSnoozed };
  }
  return { bucket: 'not-started', label: BUCKET_LABEL['not-started'], isSnoozed: false };
}

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isEditableBy(field: FieldConfig, role: UserRole): boolean {
  return field.editableBy === 'all' || field.editableBy.includes(role);
}

export default function ScreeningReferralLogTable({
  data,
  onRefresh,
  editable = true,
  userRole = 'admin',
  expandRecordId,
  onExpandHandled,
}: {
  data: string[][];
  onRefresh: () => void;
  editable?: boolean;
  userRole?: UserRole;
  expandRecordId?: string | null;
  onExpandHandled?: () => void;
}) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const expandedRowRef = useRef<HTMLTableRowElement | null>(null);

  const headers = data[0] || [];
  const allRows = useMemo(() => data.slice(1), [data]);

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
  const rows = q
    ? allRows.filter(r =>
        (r[0] || '').toLowerCase().includes(q) ||
        (r[3] || '').toLowerCase().includes(q)
      )
    : allRows;

  // Counters for the status banner
  const statusCounts = rows.reduce((acc, r) => {
    const s = statusFor(r, headers).bucket;
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<OverallBucket, number>);

  const handleExpand = (rowIdx: number) => {
    if (!editable) return;
    if (expandedRow === rowIdx) {
      setExpandedRow(null);
      return;
    }
    setExpandedRow(rowIdx);
    const row = rows[rowIdx];
    const values: Record<string, string> = {};
    FIELDS.forEach(f => { values[f.key] = row[f.col] || ''; });
    setEditValues(values);
  };

  const handleSave = async (screeningReferralId: string) => {
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
      </div>

      {editable && (
        <div className="text-xs text-gray-500 mb-2">
          Signed in as <span className="font-semibold capitalize">{userRole.replace('-', ' ')}</span>.
          Click a row to expand. Fields highlighted in <span className="px-1 rounded bg-amber-100 text-amber-800">amber</span> are your team&rsquo;s responsibility.
        </div>
      )}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto overflow-y-auto" style={{ maxHeight: '70vh' }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
            <tr className="border-b">
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">Status</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">Transcript</th>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
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
                  isExpanded={expandedRow === i}
                  editable={editable}
                  userRole={userRole}
                  editValues={editValues}
                  setEditValues={setEditValues}
                  onExpand={() => handleExpand(i)}
                  onSave={() => handleSave(row[0])}
                  onCancel={() => setExpandedRow(null)}
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
  row, headers, isExpanded, editable, userRole, editValues, setEditValues,
  onExpand, onSave, onCancel, saving, statusLabel, statusBadge, rowRef,
}: {
  row: string[];
  headers: string[];
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

  return (
    <>
      <tr
        ref={rowRef}
        onClick={onExpand}
        className={`border-b transition-colors ${editable ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
      >
        <td className="px-3 py-2 whitespace-nowrap">
          <span className={`px-2 py-0.5 rounded text-[10px] ${statusBadge}`}>{statusLabel}</span>
        </td>
        <td className="px-3 py-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
          <TranscriptLink conversationId={row[1] || ''} />
        </td>
        {headers.map((_, j) => (
          <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate" title={row[j] || ''}>{row[j] || ''}</td>
        ))}
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={headers.length + 2} className="bg-blue-50/50 px-6 py-4">
            <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
              <div className="text-sm font-semibold text-gray-700">Edit record — {row[0]}</div>
              <div className="text-[11px] text-gray-500">
                Highlighted fields = your team&rsquo;s responsibility · greyed out = read-only for your role
              </div>
            </div>

            {GROUPS.map(group => (
              <FieldGroupBlock
                key={group.title}
                group={group}
                userRole={userRole}
                editValues={editValues}
                setEditValues={setEditValues}
              />
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
  const isYourResponsibility = field.primaryFor === userRole || field.autoStampFor === userRole;
  const wrapperClass =
    field.type === 'textarea' ? 'md:col-span-2 lg:col-span-3' :
    field.type === 'radio' && (field.options?.length || 0) > 3 ? 'md:col-span-2' : '';

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
          className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none disabled:bg-transparent disabled:cursor-not-allowed"
        />
      )}
      {field.type === 'text' && (
        <input
          type="text"
          disabled={!canEdit}
          value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none disabled:bg-transparent disabled:cursor-not-allowed"
        />
      )}
      {field.type === 'textarea' && (
        <textarea
          rows={3}
          disabled={!canEdit}
          value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none disabled:bg-transparent disabled:cursor-not-allowed"
        />
      )}
      {field.type === 'date' && (
        <input
          type="date"
          disabled={!canEdit}
          value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none disabled:bg-transparent disabled:cursor-not-allowed"
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
