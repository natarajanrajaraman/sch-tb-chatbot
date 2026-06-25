'use client';

// v1.6 — Per-stage drill-down table. One row per stage in the pathway,
// counting how many patients are at each stage status (In progress /
// Overdue / Completed). "Not applicable" rows are excluded from each
// stage's denominator.

import { JourneyState, StageStatus } from '@/lib/journeyState';

interface StageBreakdownTableProps {
  title: string;
  journeys: JourneyState[];
}

export default function StageBreakdownTable({ title, journeys }: StageBreakdownTableProps) {
  // Build the stage key order from the first non-empty journey so we
  // preserve the pathway's stage sequence.
  const stageOrder: { key: string; label: string }[] = [];
  for (const j of journeys) {
    if (j.stages.length > 0) {
      for (const s of j.stages) {
        if (!stageOrder.find(x => x.key === s.key)) {
          stageOrder.push({ key: s.key, label: s.label });
        }
      }
      if (stageOrder.length > 0) break;
    }
  }

  // Per-stage status counts. We only include patients for whom the
  // stage is applicable (skipping not-applicable).
  function countsFor(stageKey: string): { total: number; counts: Record<StageStatus, number> } {
    const counts: Record<StageStatus, number> = {
      'not-applicable': 0,
      'not-started': 0,
      'in-progress': 0,
      'overdue': 0,
      'completed': 0,
    };
    let total = 0;
    for (const j of journeys) {
      const stage = j.stages.find(s => s.key === stageKey);
      if (!stage) continue;
      counts[stage.status] += 1;
      if (stage.status !== 'not-applicable') total += 1;
    }
    return { total, counts };
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">{title}</h4>
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Stage</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600">Applicable</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600">Not started</th>
              <th className="px-3 py-2 text-right font-semibold text-blue-700">In progress</th>
              <th className="px-3 py-2 text-right font-semibold text-red-700">Overdue</th>
              <th className="px-3 py-2 text-right font-semibold text-emerald-700">Completed</th>
            </tr>
          </thead>
          <tbody>
            {stageOrder.map(({ key, label }, i) => {
              const { total, counts } = countsFor(key);
              return (
                <tr key={key} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                  <td className="px-3 py-2 text-slate-700">{label}</td>
                  <td className="px-3 py-2 text-right text-slate-700 tabular-nums">{total}</td>
                  <td className="px-3 py-2 text-right text-slate-600 tabular-nums">{counts['not-started']}</td>
                  <td className="px-3 py-2 text-right text-blue-800 tabular-nums">{counts['in-progress']}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${counts['overdue'] > 0 ? 'text-red-800 font-semibold' : 'text-slate-400'}`}>{counts['overdue']}</td>
                  <td className="px-3 py-2 text-right text-emerald-800 tabular-nums">{counts['completed']}</td>
                </tr>
              );
            })}
            {stageOrder.length === 0 && (
              <tr><td colSpan={6} className="text-center py-4 text-slate-400">No records.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
