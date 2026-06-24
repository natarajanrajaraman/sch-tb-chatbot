'use client';

import { useState } from 'react';
import { downloadCSV } from './DataTable';

const FOLLOW_UP_FIELDS = [
  { key: 'contactAttempts', label: 'Contact Attempts', type: 'number' as const, col: 12 },
  { key: 'clientContacted', label: 'Client Contacted', type: 'yesno' as const, col: 13 },
  { key: 'referralGivenByTelehealth', label: 'Referral Given by Telehealth', type: 'yesno' as const, col: 14 },
  { key: 'arrivedAtCenter', label: 'Arrived at Center', type: 'yesno' as const, col: 15 },
  { key: 'cxrCompleted', label: 'CXR Completed', type: 'yesno' as const, col: 16 },
  { key: 'cxrResult', label: 'CXR Result', type: 'select' as const, options: ['', '+ve', '-ve', 'Indeterminate'], col: 17 },
  { key: 'xpertCompleted', label: 'Xpert MTB/RIF Completed', type: 'yesno' as const, col: 18 },
  { key: 'xpertResult', label: 'Xpert MTB/RIF Result', type: 'select' as const, options: ['', 'T', 'TT', 'RR', 'N', 'TI', 'I'], col: 19 },
];

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

  if (data.length === 0) {
    return <div className="text-center py-12 text-gray-400">No screening referral log data yet.</div>;
  }

  const headers = data[0] || [];
  const rows = data.slice(1);

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

  const handleSave = async (referralId: string) => {
    setSaving(true);
    try {
      await fetch('/api/referral-log', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralId, ...editValues }),
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">Screening Referral Log ({rows.length} records)</h2>
        <button
          onClick={() => downloadCSV(data, 'Screening Referral Log')}
          className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
        >
          Download CSV
        </button>
      </div>
      {editable && (
        <div className="text-xs text-gray-500 mb-2">
          Click a row to expand and edit follow-up tracking fields.
        </div>
      )}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b">
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
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
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScreeningReferralRow({
  row, headers, isExpanded, editable, editValues, setEditValues, onExpand, onSave, onCancel, saving,
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
}) {
  return (
    <>
      <tr
        onClick={onExpand}
        className={`border-b transition-colors ${editable ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
      >
        {headers.map((_, j) => (
          <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate" title={row[j] || ''}>{row[j] || ''}</td>
        ))}
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={headers.length} className="bg-blue-50/50 px-6 py-4">
            <div className="text-sm font-semibold text-gray-700 mb-3">Follow-up Tracking — {row[0]}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {FOLLOW_UP_FIELDS.map(field => (
                <div key={field.key}>
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
