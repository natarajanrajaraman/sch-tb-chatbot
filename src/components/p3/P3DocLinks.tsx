'use client';

// Web-viewable links to the docs that testers + reviewers need on
// hand during prototype validation. All links go to GitHub's
// rendered Markdown view (not raw source).

const REPO_BASE = 'https://github.com/natarajanrajaraman/sch-tb-chatbot/blob/master';

// SCH-facing user guide lives on the shared drive (raj@equity.tech).
// Engineers update the source at docs/USER-GUIDE.md and sync into this
// gdoc on each version bump — see docs/PRODUCTION-HANDOFF.md §14 "User
// guide maintenance".
// v1.5: recreated under a new doc id after gog markdown find-replace
// stalled on 16KB content; the proven path is `gog docs create --file`.
const USER_GUIDE_GDOC = 'https://docs.google.com/document/d/14YYjIlCwWrvQc9hlwoqCTwqWQHMtgvH0r24MISSdrvA/edit';

type Link = { label: string; href: string; tag?: string };

const LINKS: Link[] = [
  { label: 'User Guide (SCH-facing)', href: USER_GUIDE_GDOC, tag: 'GDOC' },
  { label: 'SRS (engineering spec)', href: `${REPO_BASE}/docs/SRS.md`, tag: 'SPEC' },
  { label: 'README', href: `${REPO_BASE}/README.md` },
  { label: 'User journeys (testing)', href: `${REPO_BASE}/docs/USER-JOURNEYS.md` },
  { label: 'P3 — System prompt', href: `${REPO_BASE}/docs/p3-system-prompt.md`, tag: 'P3' },
  { label: 'P3 — Escalation rules', href: `${REPO_BASE}/docs/p3-escalation-rules.md`, tag: 'P3' },
  { label: 'Production handoff', href: `${REPO_BASE}/docs/PRODUCTION-HANDOFF.md` },
  { label: 'FB-bot comparison', href: `${REPO_BASE}/docs/FB-BOT-COMPARISON.md` },
  { label: 'KZ discussion points', href: `${REPO_BASE}/docs/KZ-DISCUSSION-POINTS.md` },
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
            key={link.href}
            href={link.href}
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
