'use client';

import { useState } from 'react';
import { downloadCSV } from './DataTable';
import TranscriptLink from './TranscriptLink';

const EDITABLE_FIELDS = [
  { key: 'careProviderName', label: 'Care Provider', col: 6 },
  { key: 'careProviderTownship', label: 'Township', col: 7 },
  { key: 'careProviderContact', label: 'Provider Contact', col: 8 },
  { key: 'reasonForReferral', label: 'Reason', col: 9 },
  { key: 'status', label: 'Status', col: 10, options: ['Pending', 'Contacted', 'In Care', 'Closed', 'Lost'] },
  { key: 'followUpDate', label: 'Follow-up Date', col: 11, type: 'date' as const },
  { key: 'notes', label: 'Notes', col: 12 },
  { key: 'patientTbCaseId', label: 'Patient TB Case ID', col: 13 },
  { key: 'patientContact', label: 'Patient Contact', col: 14 },
];

export default function CareReferralLogTable({
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
    return (
      <div className="text-center py-12 text-gray-400">
        No care referral log data yet. Care referrals will appear here as the P3 patient/caregiver chatbot routes them.
      </div>
    );
  }

  const headers = data[0] || [];
  const allRows = data.slice(1);
  const q = search.trim().toLowerCase();
  // Column 0 = careReferralId, column 3 = clientName
  const rows = q
    ? allRows.filter(r =>
        (r[0] || '').toLowerCase().includes(q) ||
        (r[3] || '').toLowerCase().includes(q)
      )
    : allRows;

  const handleExpand = (rowIdx: number) => {
    if (!editable) return;
    if (expandedRow === rowIdx) {
      setExpandedRow(null);
      return;
    }
    setExpandedRow(rowIdx);
    const row = rows[rowIdx];
    const values: Record<string, string> = {};
    EDITABLE_FIELDS.forEach(f => {
      values[f.key] = row[f.col] || '';
    });
    setEditValues(values);
  };

  const handleSave = async (careReferralId: string) => {
    setSaving(true);
    try {
      await fetch('/api/care-referral-log', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ careReferralId, ...editValues }),
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
          Care Referral Log ({rows.length}{q ? ` of ${allRows.length}` : ''} records)
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by careReferralId or client name"
            className="px-3 py-1.5 text-xs border rounded-md w-64 focus:ring-1 focus:ring-blue-400 outline-none"
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
            onClick={() => downloadCSV(data, 'Care Referral Log')}
            className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
          >
            Download CSV
          </button>
        </div>
      </div>
      {editable && (
        <div className="text-xs text-gray-500 mb-2">
          Click a row to expand and edit care-provider, status, follow-up date, and notes.
        </div>
      )}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto overflow-y-auto" style={{ maxHeight: '70vh' }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
            <tr className="border-b">
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">Transcript</th>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <>
                <tr
                  key={`row-${i}`}
                  onClick={() => handleExpand(i)}
                  className={`border-b transition-colors ${editable ? 'cursor-pointer' : ''} ${expandedRow === i ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-3 py-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    {/* Column B = conversationId in CARE_REFERRAL_LOG_HEADERS */}
                    <TranscriptLink conversationId={row[1] || ''} />
                  </td>
                  {headers.map((_, j) => (
                    <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate" title={row[j] || ''}>{row[j] || ''}</td>
                  ))}
                </tr>
                {expandedRow === i && (
                  <tr key={`expand-${i}`}>
                    <td colSpan={headers.length + 1} className="bg-blue-50/50 px-6 py-4">
                      <div className="text-sm font-semibold text-gray-700 mb-3">Edit Care Referral — {row[0]}</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {EDITABLE_FIELDS.map(field => (
                          <div key={field.key} className={field.key === 'notes' ? 'md:col-span-3' : ''}>
                            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">{field.label}</label>
                            {field.options ? (
                              <select
                                value={editValues[field.key] || ''}
                                onChange={e => setEditValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                                className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none"
                              >
                                <option value="">—</option>
                                {field.options.map(o => (
                                  <option key={o} value={o}>{o}</option>
                                ))}
                              </select>
                            ) : field.type === 'date' ? (
                              <input
                                type="date"
                                value={editValues[field.key] || ''}
                                onChange={e => setEditValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                                className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none"
                              />
                            ) : (
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
                          onClick={() => handleSave(row[0])}
                          disabled={saving}
                          className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save to Database'}
                        </button>
                        <button
                          onClick={() => setExpandedRow(null)}
                          className="px-4 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-md hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
