'use client';

import { useMemo } from 'react';
import OutcomeCards from './OutcomeCards';
import StageBreakdownTable from './StageBreakdownTable';
import {
  computeSelfCheckJourney,
  computePatientSupportJourney,
  BUCKET_BADGE,
  OverallBucket,
  JourneyState,
} from '@/lib/journeyState';

interface TelehealthDashboardProps {
  screeningData: string[][];
  careData: string[][];
  alertsData: string[][];
  onJumpToTab: (tab: 'screening' | 'care' | 'alerts') => void;
  onJumpToRecord?: (tab: 'screening' | 'care' | 'alerts', recordId: string) => void;
  // v1.7 — clicking an outcome bucket card jumps to the log tab and
  // filters it to records in that bucket.
  onJumpToBucket?: (tab: 'screening' | 'care', bucket: OverallBucket) => void;
}

interface OverdueItem {
  id: string;
  clientName: string;
  pathway: 'self-check' | 'patient-support';
  stage: string;
  ageDays: number | null;
}

export default function TelehealthDashboard({ screeningData, careData, alertsData, onJumpToTab, onJumpToRecord, onJumpToBucket }: TelehealthDashboardProps) {
  const {
    screeningJourneys,
    careJourneys,
    overdueQueue,
    openAlerts,
    openAlertsList,
  } = useMemo(() => {
    const sHeaders = screeningData[0] || [];
    const sRows = screeningData.slice(1);
    const cHeaders = careData[0] || [];
    const cRows = careData.slice(1);
    const aRows = (alertsData[0] ? alertsData.slice(1) : alertsData) || [];

    // v1.6.1 — drop empty rows (no recordId) before classification so they
    // don't pollute the outcome counts. Pair row+journey so iteration on
    // the filtered list still gives access to clientName etc.
    const screeningPairs = sRows
      .map(r => ({ row: r, j: computeSelfCheckJourney(r, sHeaders) }))
      .filter(p => !!p.j.recordId);
    const carePairs = cRows
      .map(r => ({ row: r, j: computePatientSupportJourney(r, cHeaders) }))
      .filter(p => !!p.j.recordId);

    const screeningJourneys: JourneyState[] = screeningPairs.map(p => p.j);
    const careJourneys: JourneyState[] = carePairs.map(p => p.j);

    // Overdue task queue — union across both pathways. The label points
    // to the most-overdue stage on each record so Tele-Health knows what
    // to chase.
    const overdueItems: OverdueItem[] = [];
    screeningPairs.forEach(({ row: r, j }) => {
      if (j.bucket !== 'overdue') return;
      const stage = j.stages.find(s => s.status === 'overdue');
      if (!stage) return;
      overdueItems.push({
        id: j.recordId,
        clientName: r[3] || '(no name)',
        pathway: 'self-check',
        stage: stage.label,
        ageDays: stage.ageDays,
      });
    });
    carePairs.forEach(({ row: r, j }) => {
      if (j.bucket !== 'overdue') return;
      const stage = j.stages.find(s => s.status === 'overdue');
      if (!stage) return;
      overdueItems.push({
        id: j.recordId,
        clientName: r[3] || '(anonymous)',
        pathway: 'patient-support',
        stage: stage.label,
        ageDays: stage.ageDays,
      });
    });
    overdueItems.sort((a, b) => (b.ageDays ?? 0) - (a.ageDays ?? 0));

    // Alerts: columns A-M per ALERTS_LOG_HEADERS
    const alertItems: { alertId: string; level: string; ts: string; reason: string; snippet: string; careReferralId: string; conversationId: string }[] = [];
    for (const r of aRows) {
      const reviewStatus = (r[9] || '').trim();
      if (reviewStatus && reviewStatus !== 'Open') continue;
      alertItems.push({
        alertId: r[0] || '',
        level: (r[4] || '').trim(),
        ts: (r[2] || '').trim(),
        reason: (r[5] || '').trim(),
        snippet: (r[6] || '').trim(),
        careReferralId: (r[7] || '').trim(),
        conversationId: (r[1] || '').trim(),
      });
    }
    alertItems.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));

    return {
      screeningJourneys,
      careJourneys,
      overdueQueue: overdueItems,
      openAlerts: alertItems.length,
      openAlertsList: alertItems,
    };
  }, [screeningData, careData, alertsData]);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-gray-800">Telehealth Dashboard</h2>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span>{overdueQueue.length} overdue · {openAlerts} open alerts</span>
        </div>
      </div>

      {/* ⚠️ Open red-flag alerts — sits at the top so it can't be missed */}
      {openAlerts > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">⚠️ Open red-flag alerts ({openAlerts})</h3>
          <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Alert ID</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Level</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Trigger</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">User message</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">When</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600"></th>
                </tr>
              </thead>
              <tbody>
                {openAlertsList.slice(0, 10).map(a => (
                  <tr
                    key={a.alertId}
                    onClick={() => {
                      if (onJumpToRecord) onJumpToRecord('alerts', a.alertId);
                      else onJumpToTab('alerts');
                    }}
                    className={`border-b cursor-pointer hover:bg-gray-50 ${
                      a.level === 'immediate' ? 'bg-red-50' : 'bg-amber-50'
                    }`}
                  >
                    <td className="px-3 py-2 font-mono text-[11px]">{a.alertId}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                        a.level === 'immediate' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {a.level}
                      </span>
                    </td>
                    <td className="px-3 py-2 max-w-[260px] truncate" title={a.reason}>{a.reason}</td>
                    <td className="px-3 py-2 max-w-[300px] truncate text-gray-600 italic" title={a.snippet}>{a.snippet}</td>
                    <td className="px-3 py-2 text-[11px] text-gray-500 whitespace-nowrap">{a.ts ? new Date(a.ts).toLocaleString() : ''}</td>
                    <td className="px-3 py-2 text-[11px] text-blue-600 hover:underline whitespace-nowrap">Review →</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Screening Referral */}
      <div className="space-y-3">
        <OutcomeCards
          title="Screening Referral"
          journeys={screeningJourneys}
          onBucketClick={b => {
            if (b && onJumpToBucket) onJumpToBucket('screening', b);
            else if (b) onJumpToTab('screening');
          }}
        />
        <StageBreakdownTable title="Stages — all records" journeys={screeningJourneys} />
      </div>

      {/* Care Referral */}
      <div className="space-y-3">
        <OutcomeCards
          title="Care Referral"
          journeys={careJourneys}
          onBucketClick={b => {
            if (b && onJumpToBucket) onJumpToBucket('care', b);
            else if (b) onJumpToTab('care');
          }}
        />
        <StageBreakdownTable title="Stages — all records" journeys={careJourneys} />
      </div>

      {/* 🚨 Overdue queue — patients waiting beyond the 7-day SLA on a stage. */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">🚨 Overdue queue ({overdueQueue.length}) — patients past the 7-day SLA on a stage</h3>
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-3 py-2 text-left font-semibold text-gray-600">ID</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Client</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Pathway</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Stuck on stage</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Days overdue</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {overdueQueue.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-6 text-slate-400">Nothing overdue — nice work.</td></tr>
              ) : (
                overdueQueue.slice(0, 50).map(o => (
                  <tr
                    key={`${o.pathway}-${o.id}`}
                    className={`border-b cursor-pointer ${BUCKET_BADGE.overdue.includes('bg-red') ? 'hover:bg-red-50/50' : 'hover:bg-gray-50'}`}
                    onClick={() => {
                      const target = o.pathway === 'self-check' ? 'screening' : 'care';
                      if (onJumpToRecord) onJumpToRecord(target, o.id);
                      else onJumpToTab(target);
                    }}
                  >
                    <td className="px-3 py-2 font-mono text-[11px]">{o.id}</td>
                    <td className="px-3 py-2 text-slate-700">{o.clientName}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 text-[10px] rounded ${o.pathway === 'self-check' ? 'bg-sky-100 text-sky-800' : 'bg-violet-100 text-violet-800'}`}>
                        {o.pathway === 'self-check' ? 'Self-Check' : 'Patient Support'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{o.stage}</td>
                    <td className="px-3 py-2 text-red-800 font-semibold tabular-nums">{o.ageDays != null ? `${o.ageDays - 7}d past SLA` : '?'}</td>
                    <td className="px-3 py-2 text-[11px] text-blue-600 hover:underline whitespace-nowrap">Open →</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
