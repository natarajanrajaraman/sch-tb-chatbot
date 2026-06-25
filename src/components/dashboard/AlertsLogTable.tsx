'use client';

import { useState, useEffect, useRef } from 'react';
import { downloadCSV } from './DataTable';
import TranscriptLink from './TranscriptLink';

// Columns A..M per ALERTS_LOG_HEADERS — order matters for editable indices.
// 0 alertId · 1 conversationId · 2 alertTimestamp · 3 mode · 4 escalationLevel
// 5 triggerReason · 6 userMessageSnippet · 7 careReferralId · 8 transcriptUrl
// 9 reviewStatus · 10 reviewerNotes · 11 reviewedAt · 12 reviewedBy

const REVIEW_STATUSES = ['Open', 'Reviewed', 'Dismissed'];

export default function AlertsLogTable({
  data,
  onRefresh,
  editable = true,
  expandRecordId,
  onExpandHandled,
}: {
  data: string[][];
  onRefresh: () => void;
  editable?: boolean;
  expandRecordId?: string | null;
  onExpandHandled?: () => void;
}) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ reviewStatus: string; reviewerNotes: string; reviewedBy: string }>({ reviewStatus: '', reviewerNotes: '', reviewedBy: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const expandedRowRef = useRef<HTMLTableRowElement | null>(null);

  if (data.length === 0) {
    return <div className="text-center py-12 text-gray-400">No red-flag alerts yet — nothing for the reviewer queue.</div>;
  }

  const headers = data[0] || [];
  const allRows = data.slice(1);

  useEffect(() => {
    if (!expandRecordId) return;
    const idx = allRows.findIndex(r => r[0] === expandRecordId);
    if (idx >= 0) {
      setExpandedRow(idx);
      const row = allRows[idx];
      setEditValues({
        reviewStatus: row[9] || 'Open',
        reviewerNotes: row[10] || '',
        reviewedBy: row[12] || '',
      });
      setTimeout(() => {
        expandedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
    if (onExpandHandled) onExpandHandled();
  }, [expandRecordId, allRows, onExpandHandled]);

  const q = search.trim().toLowerCase();
  // Match by alertId, conversationId, careReferralId, or escalationLevel
  const rows = q
    ? allRows.filter(r =>
        (r[0] || '').toLowerCase().includes(q) ||
        (r[1] || '').toLowerCase().includes(q) ||
        (r[4] || '').toLowerCase().includes(q) ||
        (r[7] || '').toLowerCase().includes(q)
      )
    : allRows;

  const openCount = allRows.filter(r => !r[9] || r[9] === 'Open').length;

  const handleExpand = (i: number) => {
    if (!editable) return;
    if (expandedRow === i) { setExpandedRow(null); return; }
    setExpandedRow(i);
    const row = rows[i];
    setEditValues({
      reviewStatus: row[9] || 'Open',
      reviewerNotes: row[10] || '',
      reviewedBy: row[12] || '',
    });
  };

  const handleSave = async (alertId: string) => {
    setSaving(true);
    try {
      await fetch('/api/alerts-log', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId,
          reviewStatus: editValues.reviewStatus,
          reviewerNotes: editValues.reviewerNotes,
          reviewedBy: editValues.reviewedBy,
          reviewedAt: new Date().toISOString(),
        }),
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
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            Alerts Log ({rows.length}{q ? ` of ${allRows.length}` : ''} records · {openCount} open)
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            P3 conversations that triggered a red flag. Logged at moment of detection — even if the user later abandoned the conversation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by alertId / conversationId / level"
            className="px-3 py-1.5 text-xs border rounded-md w-72 focus:ring-1 focus:ring-blue-400 outline-none"
          />
          {q && (
            <button onClick={() => setSearch('')} className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700">✕</button>
          )}
          <button
            onClick={() => downloadCSV(data, 'Alerts Log')}
            className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
          >
            Download CSV
          </button>
        </div>
      </div>

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
            {rows.map((row, i) => {
              const isOpen = !row[9] || row[9] === 'Open';
              const isImmediate = (row[4] || '').toLowerCase() === 'immediate';
              const rowBg = isOpen
                ? (isImmediate ? 'bg-red-50 hover:bg-red-100' : 'bg-amber-50 hover:bg-amber-100')
                : 'hover:bg-gray-50';
              return (
                <>
                  <tr
                    key={`row-${i}`}
                    ref={expandedRow === i ? expandedRowRef : undefined}
                    onClick={() => handleExpand(i)}
                    className={`border-b transition-colors ${editable ? 'cursor-pointer' : ''} ${expandedRow === i ? 'bg-blue-50' : rowBg}`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <TranscriptLink conversationId={row[1] || ''} />
                    </td>
                    {headers.map((_, j) => (
                      <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[260px] truncate" title={row[j] || ''}>{row[j] || ''}</td>
                    ))}
                  </tr>
                  {expandedRow === i && (
                    <tr key={`expand-${i}`}>
                      <td colSpan={headers.length + 1} className="bg-blue-50/50 px-6 py-4">
                        <div className="text-sm font-semibold text-gray-700 mb-3">Review — {row[0]}</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Review status</label>
                            <select
                              value={editValues.reviewStatus}
                              onChange={e => setEditValues(prev => ({ ...prev, reviewStatus: e.target.value }))}
                              className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none"
                            >
                              {REVIEW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Reviewer name</label>
                            <input
                              type="text"
                              value={editValues.reviewedBy}
                              onChange={e => setEditValues(prev => ({ ...prev, reviewedBy: e.target.value }))}
                              placeholder="e.g. Dr Phone Pyae Sone"
                              className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Reviewer notes</label>
                            <textarea
                              value={editValues.reviewerNotes}
                              onChange={e => setEditValues(prev => ({ ...prev, reviewerNotes: e.target.value }))}
                              rows={3}
                              placeholder="Triage decision, follow-up actions, false positive notes, etc."
                              className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => handleSave(row[0])}
                            disabled={saving}
                            className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50"
                          >
                            {saving ? 'Saving...' : 'Save review'}
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
