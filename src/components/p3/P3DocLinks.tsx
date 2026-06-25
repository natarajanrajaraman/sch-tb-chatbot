'use client';

// Web-viewable links to the docs that testers + reviewers need on
// hand during prototype validation. All links go to GitHub's
// rendered Markdown view (not raw source).

const REPO_BASE = 'https://github.com/natarajanrajaraman/sch-tb-chatbot/blob/master';

const LINKS: { label: string; path: string; tag?: string }[] = [
  { label: 'README', path: 'README.md' },
  { label: 'User journeys (testing)', path: 'docs/USER-JOURNEYS.md' },
  { label: 'P3 — System prompt', path: 'docs/p3-system-prompt.md', tag: 'P3' },
  { label: 'P3 — Escalation rules', path: 'docs/p3-escalation-rules.md', tag: 'P3' },
  { label: 'Production handoff', path: 'docs/PRODUCTION-HANDOFF.md' },
  { label: 'FB-bot comparison', path: 'docs/FB-BOT-COMPARISON.md' },
  { label: 'KZ discussion points', path: 'docs/KZ-DISCUSSION-POINTS.md' },
];

export default function P3DocLinks() {
  return (
    <div className="px-3 py-2 border-b border-gray-700/30 bg-gray-800/40 shrink-0">
      <div className="text-[9px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
        Docs (GitHub web view)
      </div>
      <div className="space-y-0.5">
        {LINKS.map(link => (
          <a
            key={link.path}
            href={`${REPO_BASE}/${link.path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 text-[10px] text-blue-300 hover:text-blue-200 hover:bg-gray-700/30 px-1.5 py-0.5 rounded"
          >
            <span className="truncate">{link.label}</span>
            <span className="flex items-center gap-1">
              {link.tag && <span className="text-[8px] text-amber-300/80 bg-amber-500/10 px-1 rounded">{link.tag}</span>}
              <span className="opacity-70">↗</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
