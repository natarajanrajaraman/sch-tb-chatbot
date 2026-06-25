'use client';

import { useState } from 'react';
import { downloadCSV } from './DataTable';
import TranscriptLink from './TranscriptLink';

interface FieldConfig {
  key: string;
  label: string;
  col: number;     // 0-indexed position in the row array (matches REFERRAL_LOG_HEADERS)
  type: 'number' | 'yesno' | 'select' | 'date' | 'text';
  options?: string[];
}

const FOLLOW_UP_FIELDS: FieldConfig[] = [
  // Existing follow-up tracking (cols M-T = indices 12-19)
  { key: 'contactAttempts',          label: 'Contact Attempts',          type: 'number', col: 12 },
  { key: 'clientContacted',          label: 'Client Contacted',          type: 'yesno',  col: 13 },
  { key: 'referralGivenByTelehealth',label: 'Referral Given by Telehealth', type: 'yesno', col: 14 },
  { key: 'arrivedAtCenter',          label: 'Arrived at Centre',         type: 'yesno',  col: 15 },
  { key: 'cxrCompleted',             label: 'CXR Completed',             type: 'yesno',  col: 16 },
  { key: 'cxrResult',                label: 'CXR Result',                type: 'select', col: 17, options: ['', '+ve', '-ve', 'Indeterminate'] },
  { key: 'xpertCompleted',           label: 'Xpert MTB/RIF Completed',   type: 'yesno',  col: 18 },
  { key: 'xpertResult',              label: 'Xpert MTB/RIF Result',      type: 'select', col: 19, options: ['', 'T', 'TT', 'RR', 'N', 'TI', 'I'] },

  // v0.7 — old SCH FB bot's outcome / SLA / dx model (cols U-AB = indices 20-27)
  { key: 'outcome',           label: 'Outcome',              type: 'select', col: 20, options: ['', 'Pending', 'Referred', 'Reached', 'Lost'] },
  { key: 'patientDx',         label: 'Patient Dx',           type: 'select', col: 21, options: ['', 'TB', 'Non-TB'] },
  { key: 'tbRegistrationId',  label: 'TB Registration ID',   type: 'text',   col: 22 },
  { key: 'tbRegistrationDate',label: 'TB Registration Date', type: 'date',   col: 23 },
  { key: 'firstContactDate',  label: 'First Contact Date',   type: 'date',   col: 24 },
  { key: 'firstFollowupDate', label: '1st Follow-up Date',   type: 'date',   col: 25 },
  { key: 'lastFollowupDate',  label: 'Last Follow-up Date',  type: 'date',   col: 26 },
  { key: 'remarks',           label: 'Remarks',              type: 'text',   col: 27 },
];

// SLA-status helper — encodes the old SCH bot's 2-week / 2-attempt rule:
// 1st follow-up due ~Day 2-3 after first contact; last follow-up ~Day 14;
// after that, the user should be marked Lost if they haven't reached a site.
type SlaStatus = 'unset' | 'fresh' | 'first_followup_due' | 'last_followup_due' | 'sla_breach' | 'resolved' | 'lost';

function slaStatus(row: string[]): { status: SlaStatus; daysSinceContact: number | null; label: string } {
  const outcome = (row[20] || '').trim();
  const firstContact = (row[24] || '').trim();

  if (outcome === 'Lost') return { status: 'lost', daysSinceContact: null, label: 'Lost' };
  if (outcome === 'Reached' || outcome === 'TB' || outcome === 'Non-TB') {
    return { status: 'resolved', daysSinceContact: null, label: 'Resolved' };
  }
  if (!firstContact) {
    return { status: 'unset', daysSinceContact: null, label: 'No 1st contact yet' };
  }
  const start = new Date(firstContact);
  if (isNaN(start.getTime())) {
    return { status: 'unset', daysSinceContact: null, label: 'Invalid 1st contact date' };
  }
  const days = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 2) return { status: 'fresh', daysSinceContact: days, label: `${days}d — within window` };
  if (days < 12) return { status: 'first_followup_due', daysSinceContact: days, label: `${days}d — 1st FU due` };
  if (days < 14) return { status: 'last_followup_due', daysSinceContact: days, label: `${days}d — last FU due` };
  return { status: 'sla_breach', daysSinceContact: days, label: `${days}d — past 2-week SLA` };
}

const SLA_ROW_BG: Record<SlaStatus, string> = {
  unset: '',
  fresh: '',
  first_followup_due: 'bg-amber-50',
  last_followup_due: 'bg-orange-50',
  sla_breach: 'bg-red-50',
  resolved: 'bg-emerald-50',
  lost: 'bg-gray-100',
};

const SLA_BADGE_COLOR: Record<SlaStatus, string> = {
  unset: 'bg-gray-200 text-gray-700',
  fresh: 'bg-blue-100 text-blue-800',
  first_followup_due: 'bg-amber-100 text-amber-800',
  last_followup_due: 'bg-orange-100 text-orange-800',
  sla_breach: 'bg-red-100 text-red-800 font-semibold',
  resolved: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-gray-200 text-gray-600',
};

export default function ScreeningReferralLogTable({
  data,
  onRefresh,
  editable = true,
}: {
  data: string[][];
  onRefresh: () => void;
  editable?: boolean;
}) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  if (data.length === 0) {
    return <div className="text-center py-12 text-gray-400">No screening referral log data yet.</div>;
  }

  const headers = data[0] || [];
  const allRows = data.slice(1);
  const q = search.trim().toLowerCase();
  // Column 0 = screeningReferralId, column 3 = clientName
  const rows = q
    ? allRows.filter(r =>
        (r[0] || '').toLowerCase().includes(q) ||
        (r[3] || '').toLowerCase().includes(q)
      )
    : allRows;

  // SLA summary counters
  const slaCounts = rows.reduce((acc, r) => {
    const s = slaStatus(r).status;
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<SlaStatus, number>);

  const handleExpand = (rowIdx: number) => {
    if (!editable) return;
    if (expandedRow === rowIdx) {
      setExpandedRow(null);
      return;
    }
    setExpandedRow(rowIdx);
    const row = rows[rowIdx];
    const values: Record<string, string> = {};
    FOLLOW_UP_FIELDS.forEach(f => {
      values[f.key] = row[f.col] || '';
    });
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

  // Visible headers — we add the SLA column to the end
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

      {/* SLA banner — encodes the 2-week / 2-attempt follow-up rule */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-gray-600 font-medium">SLA buckets:</span>
        <span className={`px-2 py-0.5 rounded ${SLA_BADGE_COLOR.unset}`}>No 1st contact: {slaCounts.unset || 0}</span>
        <span className={`px-2 py-0.5 rounded ${SLA_BADGE_COLOR.fresh}`}>Within window: {slaCounts.fresh || 0}</span>
        <span className={`px-2 py-0.5 rounded ${SLA_BADGE_COLOR.first_followup_due}`}>1st FU due: {slaCounts.first_followup_due || 0}</span>
        <span className={`px-2 py-0.5 rounded ${SLA_BADGE_COLOR.last_followup_due}`}>Last FU due: {slaCounts.last_followup_due || 0}</span>
        <span className={`px-2 py-0.5 rounded ${SLA_BADGE_COLOR.sla_breach}`}>Past 2-week SLA: {slaCounts.sla_breach || 0}</span>
        <span className={`px-2 py-0.5 rounded ${SLA_BADGE_COLOR.resolved}`}>Resolved: {slaCounts.resolved || 0}</span>
        <span className={`px-2 py-0.5 rounded ${SLA_BADGE_COLOR.lost}`}>Lost: {slaCounts.lost || 0}</span>
      </div>

      {editable && (
        <div className="text-xs text-gray-500 mb-2">
          Click a row to expand and edit follow-up tracking, outcome, and final diagnosis.
        </div>
      )}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto overflow-y-auto" style={{ maxHeight: '70vh' }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
            <tr className="border-b">
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">SLA</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">Transcript</th>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const sla = slaStatus(row);
              const rowBg = SLA_ROW_BG[sla.status];
              return (
                <ScreeningReferralRow
                  key={i}
                  row={row}
                  headers={headers}
                  isExpanded={expandedRow === i}
                  editable={editable}
                  editValues={editValues}
                  setEditValues={setEditValues}
                  onExpand={() => handleExpand(i)}
                  onSave={() => handleSave(row[0])}
                  onCancel={() => setExpandedRow(null)}
                  saving={saving}
                  slaLabel={sla.label}
                  slaBadge={SLA_BADGE_COLOR[sla.status]}
                  rowBg={rowBg}
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
  row, headers, isExpanded, editable, editValues, setEditValues, onExpand, onSave, onCancel, saving,
  slaLabel, slaBadge, rowBg,
}: {
  row: string[];
  headers: string[];
  isExpanded: boolean;
  editable: boolean;
  editValues: Record<string, string>;
  setEditValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onExpand: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  slaLabel: string;
  slaBadge: string;
  rowBg: string;
}) {
  return (
    <>
      <tr
        onClick={onExpand}
        className={`border-b transition-colors ${editable ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-blue-50' : `${rowBg} hover:bg-gray-50`}`}
      >
        <td className="px-3 py-2 whitespace-nowrap">
          <span className={`px-2 py-0.5 rounded text-[10px] ${slaBadge}`}>{slaLabel}</span>
        </td>
        <td className="px-3 py-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
          {/* Column B = conversationId in REFERRAL_LOG_HEADERS */}
          <TranscriptLink conversationId={row[1] || ''} />
        </td>
        {headers.map((_, j) => (
          <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate" title={row[j] || ''}>{row[j] || ''}</td>
        ))}
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={headers.length + 2} className="bg-blue-50/50 px-6 py-4">
            <div className="text-sm font-semibold text-gray-700 mb-3">Follow-up & Outcome — {row[0]}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {FOLLOW_UP_FIELDS.map(field => (
                <div key={field.key} className={field.key === 'remarks' ? 'md:col-span-4' : ''}>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">{field.label}</label>
                  {field.type === 'number' && (
                    <input
                      type="number"
                      min="0"
                      value={editValues[field.key] || ''}
                      onChange={e => setEditValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none"
                    />
                  )}
                  {field.type === 'yesno' && (
                    <select
                      value={editValues[field.key] || ''}
                      onChange={e => setEditValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none"
                    >
                      <option value="">—</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  )}
                  {field.type === 'select' && (
                    <select
                      value={editValues[field.key] || ''}
                      onChange={e => setEditValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none"
                    >
                      {field.options!.map(opt => (
                        <option key={opt} value={opt}>{opt || '—'}</option>
                      ))}
                    </select>
                  )}
                  {field.type === 'date' && (
                    <input
                      type="date"
                      value={editValues[field.key] || ''}
                      onChange={e => setEditValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none"
                    />
                  )}
                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={editValues[field.key] || ''}
                      onChange={e => setEditValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none"
                    />
                  )}
                </div>
              ))}
            </div>
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
