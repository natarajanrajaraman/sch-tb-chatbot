'use client';

import { useState, useEffect, useCallback } from 'react';
import AuthGate from '@/components/AuthGate';

type TabType = 'dashboard' | 'sessions' | 'feedback' | 'referral-log' | 'care-referral-log';

const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1WNOvqyienkQNjF5ECUIPq5w30qaAVDQe0cuJrBv2P6w';

interface DashboardStats {
  totalScreenings: number;
  completedScreenings: number;
  presumptiveTB: number;
  negHighRisk: number;
  notPresumptiveTB: number;
  assistedReferrals: number;
  selfReferrals: number;
  under15Excluded: number;
  presumptiveRate: string;
}

interface ProviderSummary {
  label: string;
  count: number;
}

export default function AdminPage() {
  return (
    <AuthGate roleKey="sch-admin" roleLabel="SCH Admin View">
      <AdminInner />
    </AuthGate>
  );
}

function AdminInner() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sessions, setSessions] = useState<string[][]>([]);
  const [feedback, setFeedback] = useState<string[][]>([]);
  const [referralLogs, setReferralLogs] = useState<string[][]>([]);
  const [careReferralLogs, setCareReferralLogs] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [byProvider, setByProvider] = useState<ProviderSummary[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sessRes, fbRes, refRes, careRes] = await Promise.all([
        fetch('/api/session'),
        fetch('/api/feedback'),
        fetch('/api/referral-log'),
        fetch('/api/care-referral-log'),
      ]);
      const sessData = await sessRes.json();
      const fbData = await fbRes.json();
      const refData = await refRes.json();
      const careData = await careRes.json();

      setSessions(sessData.data || []);
      setFeedback(fbData.data || []);
      setReferralLogs(refData.data || []);
      setCareReferralLogs(careData.data || []);

      // Calculate stats from session data — resolve column positions from
      // the header row so we stay correct across schema changes. Old v0.2/v0.3
      // rows had a 27-column shape with classification/referralType/status
      // at different positions; we detect those by row length and fall back to
      // the legacy positions so the stats reflect ALL data, not just v0.4+ rows.
      const allRows = sessData.data || [];
      const headers: string[] = allRows[0] || [];
      const rows: string[][] = allRows.slice(1);
      const col = (name: string) => headers.findIndex(h => h === name);

      // Legacy v0.2/v0.3 column positions (27-col schema)
      const LEGACY_COLS = {
        classification: 17,
        referralType: 18,
        referralTownship: 19,
        status: 23,
        under15Excluded: 24,
      };

      const cClassification = col('classification');
      const cReferralType = col('referralType');
      const cStatus = col('status');
      const cUnder15 = col('under15Excluded');
      const cTownship = col('referralTownship');
      const cFacility = col('referralSitesShown');

      function readCol(row: string[], modernIdx: number, legacyIdx: number): string {
        // If the row has the modern column populated, use it. Otherwise check
        // the legacy position. Row length is the discriminator.
        if (modernIdx >= 0 && row[modernIdx] !== undefined && row[modernIdx] !== '') {
          return row[modernIdx];
        }
        // Older v0.2/v0.3 rows have 27-ish columns total; if this row's last
        // populated cell is below the modern header range, use the legacy slot.
        if (row.length <= 27 && row[legacyIdx] !== undefined) {
          return row[legacyIdx];
        }
        return row[modernIdx] || '';
      }

      const completed = rows.filter(r => readCol(r, cStatus, LEGACY_COLS.status) === 'completed');
      const presumptive = rows.filter(r => readCol(r, cClassification, LEGACY_COLS.classification) === 'Presumptive TB');
      const negHighRisk = rows.filter(r => readCol(r, cClassification, LEGACY_COLS.classification) === 'Negative (High Risk)');
      const notPresumptive = rows.filter(r => readCol(r, cClassification, LEGACY_COLS.classification) === 'Not Presumptive TB');
      const assisted = rows.filter(r => readCol(r, cReferralType, LEGACY_COLS.referralType) === 'Assisted');
      const self = rows.filter(r => readCol(r, cReferralType, LEGACY_COLS.referralType) === 'Self');
      const excluded = rows.filter(r => readCol(r, cUnder15, LEGACY_COLS.under15Excluded) === 'Yes');

      // By-provider/township summary — count referrals grouped by destination
      const providerCounts: Record<string, number> = {};
      for (const r of rows) {
        const refType = readCol(r, cReferralType, LEGACY_COLS.referralType);
        if (refType !== 'Assisted' && refType !== 'Self') continue;
        const facility = (cFacility >= 0 ? (r[cFacility] || '') : '').trim();
        const township = readCol(r, cTownship, LEGACY_COLS.referralTownship).trim();
        const key = facility ? `${facility}${township ? ` · ${township}` : ''}` : township || '(unknown)';
        providerCounts[key] = (providerCounts[key] || 0) + 1;
      }
      const byProvider = Object.entries(providerCounts)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);
      setByProvider(byProvider);

      setStats({
        totalScreenings: rows.length,
        completedScreenings: completed.length,
        presumptiveTB: presumptive.length,
        negHighRisk: negHighRisk.length,
        notPresumptiveTB: notPresumptive.length,
        assistedReferrals: assisted.length,
        selfReferrals: self.length,
        under15Excluded: excluded.length,
        presumptiveRate: rows.length > 0
          ? ((presumptive.length / Math.max(1, presumptive.length + negHighRisk.length + notPresumptive.length)) * 100).toFixed(1) + '%'
          : 'N/A',
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'sessions', label: 'Sessions', icon: '💬' },
    { id: 'feedback', label: 'Feedback', icon: '📝' },
    { id: 'referral-log', label: 'Screening Referral Log', icon: '🏥' },
    { id: 'care-referral-log', label: 'Care Referral Log', icon: '🤝' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">SCH Admin View — SCH TB Chatbot</h1>
          <p className="text-xs text-gray-400">
            Database:{' '}
            <a
              href={SPREADSHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              SCH TB Chatbot - Database [PROTOTYPE] ↗
            </a>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
          >
            🔄 Refresh
          </button>
          <a href="/" className="px-3 py-1.5 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-500">
            ← Back to Chat
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-6 flex gap-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading data...</div>
        ) : (
          <>
            {activeTab === 'dashboard' && stats && <DashboardView stats={stats} byProvider={byProvider} />}
            {activeTab === 'sessions' && <DataTable data={sessions} title="Sessions" />}
            {activeTab === 'feedback' && <DataTable data={feedback} title="Feedback" />}
            {activeTab === 'referral-log' && <ReferralLogTable data={referralLogs} onRefresh={fetchData} />}
            {activeTab === 'care-referral-log' && <DataTable data={careReferralLogs} title="Care Referral Log" />}
          </>
        )}
      </div>
    </div>
  );
}

function DashboardView({ stats, byProvider }: { stats: DashboardStats; byProvider: ProviderSummary[] }) {
  const cards = [
    { label: 'Total Screenings', value: stats.totalScreenings, color: 'bg-blue-500' },
    { label: 'Completed', value: stats.completedScreenings, color: 'bg-green-500' },
    { label: 'Presumptive TB', value: stats.presumptiveTB, color: 'bg-red-500' },
    { label: 'Negative (High Risk)', value: stats.negHighRisk, color: 'bg-amber-500' },
    { label: 'Not Presumptive', value: stats.notPresumptiveTB, color: 'bg-emerald-500' },
    { label: 'Presumptive Rate', value: stats.presumptiveRate, color: 'bg-orange-500' },
    { label: 'Assisted Referrals', value: stats.assistedReferrals, color: 'bg-purple-500' },
    { label: 'Self Referrals', value: stats.selfReferrals, color: 'bg-indigo-500' },
    { label: 'Under 15 Excluded', value: stats.under15Excluded, color: 'bg-gray-500' },
  ];

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-800 mb-4">Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className="bg-white rounded-lg shadow-sm p-5">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{card.label}</div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${card.color}`} />
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Referrals by destination provider / township */}
      <div className="mt-8">
        <h3 className="text-base font-bold text-gray-800 mb-2">Referrals by destination</h3>
        <p className="text-xs text-gray-500 mb-3">
          Grouped by destination facility · township from the Sessions sheet.
        </p>
        {byProvider.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-4 text-center text-gray-400 text-sm">
            No referrals yet.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Destination</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Referrals</th>
                </tr>
              </thead>
              <tbody>
                {byProvider.map(p => (
                  <tr key={p.label} className="border-b last:border-b-0">
                    <td className="px-4 py-2 text-gray-700">{p.label}</td>
                    <td className="px-4 py-2 text-right font-semibold text-gray-900">{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {stats.totalScreenings === 0 && (
        <div className="mt-8 text-center text-gray-400 py-8">
          No screening data yet. Complete a screening in the chatbot to see data here.
        </div>
      )}
    </div>
  );
}

function downloadCSV(data: string[][], title: string) {
  const csvContent = data.map(row =>
    row.map(cell => {
      const escaped = (cell || '').replace(/"/g, '""');
      return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
        ? `"${escaped}"`
        : escaped;
    }).join(',')
  ).join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `tb-chatbot-${title.toLowerCase().replace(/\s+/g, '-')}-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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

function ReferralLogTable({ data, onRefresh }: { data: string[][]; onRefresh: () => void }) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (data.length === 0) {
    return <div className="text-center py-12 text-gray-400">No referral log data available yet.</div>;
  }

  const headers = data[0] || [];
  const rows = data.slice(1);

  const handleExpand = (rowIdx: number) => {
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">Screening Referral Log ({rows.length} records)</h2>
        <button
          onClick={() => downloadCSV(data, 'Screening Referral Log')}
          className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
        >
          Download CSV
        </button>
      </div>
      <div className="text-xs text-gray-500 mb-2">Click a row to expand and edit follow-up tracking fields</div>
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto overflow-y-auto" style={{ maxHeight: '70vh' }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
            <tr className="border-b">
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
                  className={`border-b cursor-pointer transition-colors ${expandedRow === i ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  {headers.map((_, j) => (
                    <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate" title={row[j] || ''}>{row[j] || ''}</td>
                  ))}
                </tr>
                {expandedRow === i && (
                  <tr key={`expand-${i}`}>
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

function DataTable({ data, title }: { data: string[][]; title: string }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No {title.toLowerCase()} data available yet.
      </div>
    );
  }

  const headers = data[0] || [];
  const rows = data.slice(1);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">{title} ({rows.length} records)</h2>
        <button
          onClick={() => downloadCSV(data, title)}
          className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
        >
          Download CSV
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto overflow-y-auto" style={{ maxHeight: '70vh' }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
            <tr className="border-b">
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate" title={cell}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
