'use client';

// v1.6 — Self-Check Outcome / Patient Support Outcome KPI cards.
// Five buckets per pathway: Not yet started / In progress / Overdue /
// Completed / Abandoned. Clickable; click handler is passed in (parent
// decides what filtering to apply to the table view below).

import { BUCKET_LABEL, BUCKET_BORDER, OverallBucket, JourneyState } from '@/lib/journeyState';

const ORDER: OverallBucket[] = ['not-started', 'in-progress', 'overdue', 'completed', 'abandoned'];

interface OutcomeCardsProps {
  title: string;
  journeys: JourneyState[];
  selectedBucket?: OverallBucket | null;
  onBucketClick?: (bucket: OverallBucket | null) => void;
}

export default function OutcomeCards({
  title,
  journeys,
  selectedBucket,
  onBucketClick,
}: OutcomeCardsProps) {
  const counts: Record<OverallBucket, number> = {
    'not-started': 0,
    'in-progress': 0,
    'overdue': 0,
    'completed': 0,
    'abandoned': 0,
  };
  for (const j of journeys) counts[j.bucket] += 1;
  const total = journeys.length;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 gap-3 flex-wrap">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <div className="text-[11px] text-slate-500">
          {total} record{total === 1 ? '' : 's'} · click a card to filter the table below ·{' '}
          <a href="https://github.com/natarajanrajaraman/sch-tb-chatbot/blob/master/docs/USER-GUIDE.md#46-the-patient-journey--conceptual-model" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            stage SLA: 7 days
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {ORDER.map(bucket => {
          const isActive = selectedBucket === bucket;
          return (
            <button
              key={bucket}
              onClick={() => onBucketClick?.(isActive ? null : bucket)}
              className={`text-left bg-white rounded-lg shadow-sm p-3 border-l-4 ${BUCKET_BORDER[bucket]} hover:shadow-md transition-shadow ${isActive ? 'ring-2 ring-blue-400' : ''}`}
            >
              <div className="text-[10px] text-gray-500 uppercase tracking-wide leading-tight">{BUCKET_LABEL[bucket]}</div>
              <div className="text-2xl font-bold text-gray-900 mt-0.5">{counts[bucket]}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                {total === 0 ? '—' : `${Math.round((counts[bucket] / total) * 100)}% of total`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
