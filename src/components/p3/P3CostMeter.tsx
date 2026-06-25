'use client';

import { P3_MODELS } from '@/lib/p3/models';
import type { P3UsageSnapshot } from './P3ChatPanel';

interface P3CostMeterProps {
  modelId: string;
  onModelChange: (id: string) => void;
  usage: P3UsageSnapshot;
  onReset: () => void;
  visible: boolean;
}

export default function P3CostMeter({ modelId, onModelChange, usage, onReset, visible }: P3CostMeterProps) {
  if (!visible) return null;
  const totalTokens = usage.totalPromptTokens + usage.totalCompletionTokens;
  return (
    <div className="px-3 py-2 border-b border-gray-700/30 bg-gray-900/40 shrink-0 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="text-[9px] font-medium text-gray-500 uppercase tracking-wider">P3 — LLM cost meter</div>
        <button
          onClick={onReset}
          className="text-[9px] text-gray-500 hover:text-gray-300"
          title="Reset P3 conversation + cost counter"
        >
          ↺ Reset
        </button>
      </div>

      <div>
        <label className="block text-[9px] text-gray-500 mb-1">Model</label>
        <select
          value={modelId}
          onChange={e => onModelChange(e.target.value)}
          className="w-full bg-gray-800 text-gray-200 text-[10px] px-2 py-1 rounded border border-gray-700"
        >
          {P3_MODELS.map(m => (
            <option key={m.id} value={m.id}>
              {m.label} — {m.band} (in ${m.pricePerMTokenInputUsd}/M, out ${m.pricePerMTokenOutputUsd}/M)
            </option>
          ))}
        </select>
      </div>

      <div className="text-[10px] text-gray-300 space-y-0.5">
        <div className="flex justify-between">
          <span className="text-gray-500">Tokens (in / out)</span>
          <span className="font-mono">{usage.totalPromptTokens.toLocaleString()} / {usage.totalCompletionTokens.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Total tokens</span>
          <span className="font-mono">{totalTokens.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Est. cost (USD)</span>
          <span className="font-mono text-yellow-300">${usage.estCostUsd.toFixed(5)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Last escalation</span>
          <span className={
            usage.lastEscalationLevel === 'immediate' ? 'text-red-400' :
            usage.lastEscalationLevel === 'telehealth' ? 'text-orange-400' :
            usage.lastEscalationLevel === 'nonurgent' ? 'text-amber-300' :
            'text-gray-400'
          }>
            {usage.lastEscalationLevel}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Escalations</span>
          <span className="font-mono">{usage.escalationsCount}</span>
        </div>
        {usage.careReferralIds.length > 0 && (
          <div className="text-[9px] text-gray-400 pt-1 border-t border-gray-700/30">
            <div className="text-gray-500 mb-0.5">careReferralIds</div>
            {usage.careReferralIds.map(id => (
              <div key={id} className="font-mono truncate">{id}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
