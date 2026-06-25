'use client';

import { useMemo, useState } from 'react';

type SlaBucket = 'past_sla' | 'last_fu_due' | 'first_fu_due' | 'awaiting_first' | 'resolved_recent' | 'lost' | 'fresh';

interface Outstanding {
  id: string;
  conversationId: string;
  clientName: string;
  type: 'S' | 'C' | 'A';   // S = Screening, C = Care, A = Alert
  bucket: SlaBucket;
  daysSinceLastAction: number | null;
  lastActionLabel: string;
}

interface TelehealthDashboardProps {
  screeningData: string[][];
  careData: string[][];
  alertsData: string[][];
  onJumpToTab: (tab: 'screening' | 'care' | 'alerts') => void;
  onJumpToRecord?: (tab: 'screening' | 'care' | 'alerts', recordId: string) => void;
}

const SLA_LABEL: Record<SlaBucket, string> = {
  past_sla: 'Past 2-week SLA',
  last_fu_due: 'Last FU due',
  first_fu_due: '1st FU due',
  awaiting_first: 'Awaiting 1st contact',
  resolved_recent: 'Resolved this week',
  lost: 'Lost',
  fresh: 'Within window',
};

const SLA_BG: Record<SlaBucket, string> = {
  past_sla: 'bg-red-50 hover:bg-red-100',
  last_fu_due: 'bg-orange-50 hover:bg-orange-100',
  first_fu_due: 'bg-amber-50 hover:bg-amber-100',
  awaiting_first: 'bg-blue-50 hover:bg-blue-100',
  resolved_recent: 'bg-emerald-50 hover:bg-emerald-100',
  lost: 'bg-gray-100 hover:bg-gray-200',
  fresh: 'bg-white hover:bg-gray-50',
};

const SLA_BADGE: Record<SlaBucket, string> = {
  past_sla: 'bg-red-100 text-red-800 font-semibold',
  last_fu_due: 'bg-orange-100 text-orange-800',
  first_fu_due: 'bg-amber-100 text-amber-800',
  awaiting_first: 'bg-blue-100 text-blue-800',
  resolved_recent: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-gray-200 text-gray-600',
  fresh: 'bg-gray-100 text-gray-700',
};

// SLA cols for Screening Referral Log (per v0.7 schema, REFERRAL_LOG_HEADERS).
// Map by column header so we're resilient to additions.
function colIndex(headers: string[], name: string): number {
  return headers.findIndex(h => h === name);
}

function classifyScreeningRow(row: string[], headers: string[]): { bucket: SlaBucket; days: number | null; label: string } {
  const cOutcome = colIndex(headers, 'outcome');
  const cFirstContact = colIndex(headers, 'firstContactDate');
  const outcome = (row[cOutcome] || '').trim();
  const firstContact = (row[cFirstContact] || '').trim();

  if (outcome === 'Lost') return { bucket: 'lost', days: null, label: 'Marked Lost' };
  if (outcome === 'Reached' || outcome === 'TB' || outcome === 'Non-TB') {
    return { bucket: 'resolved_recent', days: null, label: `Resolved (${outcome})` };
  }
  if (!firstContact) {
    return { bucket: 'awaiting_first', days: null, label: 'No 1st contact yet' };
  }
  const start = new Date(firstContact);
  if (isNaN(start.getTime())) return { bucket: 'awaiting_first', days: null, label: 'Invalid date' };
  const days = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 2) return { bucket: 'fresh', days, label: `${days}d since 1st contact` };
  if (days < 12) return { bucket: 'first_fu_due', days, label: `${days}d — 1st FU due` };
  if (days < 14) return { bucket: 'last_fu_due', days, label: `${days}d — last FU due` };
  return { bucket: 'past_sla', days, label: `${days}d — past 2-week SLA` };
}

function classifyCareRow(row: string[], headers: string[]): { bucket: SlaBucket; days: number | null; label: string } {
  const cStatus = colIndex(headers, 'status');
  const cTimestamp = colIndex(headers, 'timestamp');
  const cFollowUp = colIndex(headers, 'followUpDate');
  const status = (row[cStatus] || '').trim();
  const tsStr = (row[cTimestamp] || '').trim();
  const fuStr = (row[cFollowUp] || '').trim();
  if (status === 'Lost') return { bucket: 'lost', days: null, label: 'Lost' };
  if (status === 'Closed' || status === 'In Care') {
    return { bucket: 'resolved_recent', days: null, label: status };
  }
  // Use followUpDate when present, else the row's timestamp.
  const ref = fuStr ? new Date(fuStr) : (tsStr ? new Date(tsStr) : null);
  if (!ref || isNaN(ref.getTime())) {
    return { bucket: 'awaiting_first', days: null, label: status || 'Pending' };
  }
  const days = Math.floor((Date.now() - ref.getTime()) / (1000 * 60 * 60 * 24));
  if (status === 'Pending' && days < 2) return { bucket: 'fresh', days, label: `${days}d since referral` };
  if (status === 'Pending' && days < 12) return { bucket: 'first_fu_due', days, label: `${days}d — 1st FU due` };
  if (status === 'Pending' && days < 14) return { bucket: 'last_fu_due', days, label: `${days}d — last FU due` };
  if (days >= 14 && status !== 'In Care' && status !== 'Closed') {
    return { bucket: 'past_sla', days, label: `${days}d — past 2-week SLA` };
  }
  return { bucket: 'fresh', days, label: `${days}d — ${status}` };
}

export default function TelehealthDashboard({ screeningData, careData, alertsData, onJumpToTab, onJumpToRecord }: TelehealthDashboardProps) {
  const [sortBy, setSortBy] = useState<'urgency' | 'oldest' | 'newest' | 'name'>('urgency');

  const { outstanding, slaCounts, openAlerts } = useMemo(() => {
    const sHeaders = screeningData[0] || [];
    const sRows = screeningData.slice(1);
    const cHeaders = careData[0] || [];
    const cRows = careData.slice(1);
    const aRows = (alertsData[0] ? alertsData.slice(1) : alertsData) || [];

    const result: Outstanding[] = [];

    for (const r of sRows) {
      const cls = classifyScreeningRow(r, sHeaders);
      result.push({
        id: r[0] || '',
        conversationId: r[1] || '',
        clientName: r[3] || '(no name)',
        type: 'S',
        bucket: cls.bucket,
        daysSinceLastAction: cls.days,
        lastActionLabel: cls.label,
      });
    }
    for (const r of cRows) {
      const cls = classifyCareRow(r, cHeaders);
      result.push({
        id: r[0] || '',
        conversationId: r[1] || '',
        clientName: r[3] || '(anonymous)',
        type: 'C',
        bucket: cls.bucket,
        daysSinceLastAction: cls.days,
        lastActionLabel: cls.label,
      });
    }

    const counts: Record<SlaBucket, { total: number; S: number; C: number; A: number }> = {
      past_sla: { total: 0, S: 0, C: 0, A: 0 },
      last_fu_due: { total: 0, S: 0, C: 0, A: 0 },
      first_fu_due: { total: 0, S: 0, C: 0, A: 0 },
      awaiting_first: { total: 0, S: 0, C: 0, A: 0 },
      resolved_recent: { total: 0, S: 0, C: 0, A: 0 },
      lost: { total: 0, S: 0, C: 0, A: 0 },
      fresh: { total: 0, S: 0, C: 0, A: 0 },
    };
    for (const o of result) {
      counts[o.bucket].total += 1;
      counts[o.bucket][o.type] += 1;
    }

    const openAlertCount = aRows.filter(r => {
      const reviewStatus = (r[9] || '').trim();
      return !reviewStatus || reviewStatus === 'Open';
    }).length;

    return { outstanding: result, slaCounts: counts, openAlerts: openAlertCount };
  }, [screeningData, careData, alertsData]);

  const sortFn = useMemo(() => {
    if (sortBy === 'name') return (a: Outstanding, b: Outstanding) => a.clientName.localeCompare(b.clientName);
    if (sortBy === 'oldest') return (a: Outstanding, b: Outstanding) => (b.daysSinceLastAction || 0) - (a.daysSinceLastAction || 0);
    if (sortBy === 'newest') return (a: Outstanding, b: Outstanding) => (a.daysSinceLastAction || 0) - (b.daysSinceLastAction || 0);
    // Urgency default: past_sla > last_fu_due > first_fu_due > awaiting_first > rest, then by days within
    const rank: Record<SlaBucket, number> = {
      past_sla: 0, last_fu_due: 1, first_fu_due: 2, awaiting_first: 3, fresh: 4, resolved_recent: 5, lost: 6,
    };
    return (a: Outstanding, b: Outstanding) => {
      const r = rank[a.bucket] - rank[b.bucket];
      if (r !== 0) return r;
      return (b.daysSinceLastAction || 0) - (a.daysSinceLastAction || 0);
    };
  }, [sortBy]);

  const filterFor = (buckets: SlaBucket[]) => outstanding.filter(o => buckets.includes(o.bucket)).sort(sortFn);

  const pastSlaQueue = filterFor(['past_sla']).slice(0, 10);
  const followupsDueQueue = filterFor(['last_fu_due', 'first_fu_due']).slice(0, 10);
  const awaitingFirstQueue = filterFor(['awaiting_first']).slice(0, 10);

  const card = (label: string, count: number, sub: { S: number; C: number }, color: string, onClick?: () => void) => (
    <button
      onClick={onClick}
      className={`text-left bg-white rounded-lg shadow-sm p-4 border-l-4 ${color} hover:shadow-md transition-shadow w-full`}
    >
      <div className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-0.5">{count}</div>
      <div className="text-[11px] text-gray-500 mt-0.5">S: {sub.S} · C: {sub.C}</div>
    </button>
  );

  const queueRow = (o: Outstanding) => (
    <tr
      key={`${o.type}-${o.id}`}
      className={`border-b ${SLA_BG[o.bucket]} cursor-pointer`}
      onClick={() => {
        const target = o.type === 'S' ? 'screening' : 'care';
        if (onJumpToRecord) onJumpToRecord(target, o.id);
        else onJumpToTab(target);
      }}
    >
      <td className="px-3 py-2 font-mono text-[11px]">{o.id}</td>
      <td className="px-3 py-2">{o.clientName}</td>
      <td className="px-3 py-2"><span className={`px-1.5 py-0.5 text-[10px] rounded ${o.type === 'S' ? 'bg-sky-100 text-sky-800' : 'bg-violet-100 text-violet-800'}`}>{o.type === 'S' ? 'Screening' : 'Care'}</span></td>
      <td className="px-3 py-2 text-xs"><span className={`px-2 py-0.5 rounded text-[10px] ${SLA_BADGE[o.bucket]}`}>{o.lastActionLabel}</span></td>
      <td className="px-3 py-2 text-[11px] text-blue-600 hover:underline">Open →</td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-gray-800">Telehealth Dashboard</h2>
        <div className="flex items-center gap-2 text-xs">
          <label className="text-gray-500">Sort:</label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'urgency' | 'oldest' | 'newest' | 'name')}
            className="px-2 py-1 border rounded text-xs"
          >
            <option value="urgency">Urgency (default)</option>
            <option value="oldest">Oldest first</option>
            <option value="newest">Newest first</option>
            <option value="name">Client name</option>
          </select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {card(SLA_LABEL.past_sla, slaCounts.past_sla.total, slaCounts.past_sla, 'border-red-500')}
        {card(SLA_LABEL.last_fu_due, slaCounts.last_fu_due.total, slaCounts.last_fu_due, 'border-orange-400')}
        {card(SLA_LABEL.first_fu_due, slaCounts.first_fu_due.total, slaCounts.first_fu_due, 'border-amber-400')}
        {card(SLA_LABEL.awaiting_first, slaCounts.awaiting_first.total, slaCounts.awaiting_first, 'border-blue-400')}
        <button
          onClick={() => onJumpToTab('alerts')}
          className="text-left bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-600 hover:shadow-md transition-shadow"
        >
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">⚠️ Open red-flag alerts</div>
          <div className="text-2xl font-bold text-gray-900 mt-0.5">{openAlerts}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">P3 conversations to triage</div>
        </button>
        {card(SLA_LABEL.resolved_recent, slaCounts.resolved_recent.total, slaCounts.resolved_recent, 'border-emerald-400')}
      </div>

      {/* Action queues */}
      <Section title="🚨 Past 2-week SLA — mark Lost or chase" rows={pastSlaQueue} empty="None — nice." queueRow={queueRow} />
      <Section title="📞 Follow-ups due" rows={followupsDueQueue} empty="No follow-ups due in the next 13 days." queueRow={queueRow} />
      <Section title="📋 Awaiting first contact" rows={awaitingFirstQueue} empty="No untouched referrals." queueRow={queueRow} />
    </div>
  );
}

function Section({ title, rows, empty, queueRow }: { title: string; rows: Outstanding[]; empty: string; queueRow: (o: Outstanding) => React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-3 py-2 text-left font-semibold text-gray-600">ID</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Client</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Type</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-6 text-gray-400">{empty}</td></tr>
            ) : (
              rows.map(o => queueRow(o))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
