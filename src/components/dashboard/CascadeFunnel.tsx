'use client';

import { Fragment } from 'react';

export interface CascadeNode {
  label: string;
  count: number;
  // For percentage calculation. If absent, falls back to parent count
  // (set automatically when rendering nested children).
  basis?: number;
  children?: CascadeNode[];
  // Optional small caption (e.g. "via Tele-Health · screeningId join")
  caption?: string;
}

interface CascadeFunnelProps {
  title: string;
  subtitle?: string;
  root: CascadeNode;
  // Override the bar accent. Default = blue (for self-check); pass another
  // tailwind hue for the patient-support cascade (e.g. 'violet').
  accent?: 'blue' | 'violet';
}

const ACCENTS = {
  blue: {
    barBg: 'bg-blue-50',
    barFill: 'bg-blue-500',
    text: 'text-blue-900',
    muted: 'text-blue-700',
  },
  violet: {
    barBg: 'bg-violet-50',
    barFill: 'bg-violet-500',
    text: 'text-violet-900',
    muted: 'text-violet-700',
  },
} as const;

function fmtPct(part: number, whole: number): string {
  if (!whole) return '—';
  const p = (part / whole) * 100;
  if (p === 100) return '100%';
  if (p < 1 && p > 0) return '<1%';
  return `${p.toFixed(0)}%`;
}

interface RowProps {
  node: CascadeNode;
  depth: number;
  basis: number;
  rootCount: number;
  accent: 'blue' | 'violet';
  isLast: boolean;
  prefixGuides: boolean[];
}

function Row({ node, depth, basis, rootCount, accent, isLast, prefixGuides }: RowProps) {
  const a = ACCENTS[accent];
  const widthPct = rootCount ? Math.max(2, Math.min(100, (node.count / rootCount) * 100)) : 0;
  const pctOfBasis = basis ? fmtPct(node.count, basis) : '—';
  const pctOfRoot = rootCount ? fmtPct(node.count, rootCount) : '—';

  return (
    <Fragment>
      <div className="flex items-stretch border-t border-slate-100 first:border-t-0 py-2">
        {/* Tree prefix guides */}
        <div className="flex shrink-0 font-mono text-[11px] text-slate-300 select-none">
          {prefixGuides.map((g, i) => (
            <span key={i} className="w-4 text-center">{g ? '│' : ' '}</span>
          ))}
          {depth > 0 && <span className="w-4 text-center">{isLast ? '└' : '├'}</span>}
        </div>

        {/* Bar + label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <div className={`text-sm font-medium ${a.text}`}>{node.label}</div>
            {node.caption && <div className="text-[11px] text-slate-500">{node.caption}</div>}
          </div>
          <div className="mt-1 flex items-center gap-3">
            <div className={`relative ${a.barBg} rounded-full h-2 flex-1 max-w-[60%]`}>
              <div className={`absolute inset-y-0 left-0 ${a.barFill} rounded-full`} style={{ width: `${widthPct}%` }} />
            </div>
            <div className="text-sm font-bold text-slate-900 tabular-nums">{node.count.toLocaleString()}</div>
            <div className="text-[11px] text-slate-500 whitespace-nowrap">
              {depth > 0 && <>{pctOfBasis} of parent · </>}{pctOfRoot} of total
            </div>
          </div>
        </div>
      </div>
      {node.children?.map((child, i, arr) => (
        <Row
          key={`${node.label}-${i}`}
          node={child}
          depth={depth + 1}
          basis={node.count}
          rootCount={rootCount}
          accent={accent}
          isLast={i === arr.length - 1}
          prefixGuides={[
            ...prefixGuides,
            depth > 0 ? !isLast : false,
          ]}
        />
      ))}
    </Fragment>
  );
}

export default function CascadeFunnel({ title, subtitle, root, accent = 'blue' }: CascadeFunnelProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="mb-2">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div>
        <Row
          node={root}
          depth={0}
          basis={root.count}
          rootCount={root.count}
          accent={accent}
          isLast={true}
          prefixGuides={[]}
        />
      </div>
    </div>
  );
}
