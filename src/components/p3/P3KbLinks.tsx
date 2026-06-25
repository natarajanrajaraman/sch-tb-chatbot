'use client';

// Curated list of the P3 knowledge-base sources KZ pointed us to.
// Web-viewable links (Google Drive file viewer for PDFs, official
// portals for everything else). This is the human-browseable index;
// the LLM does NOT consume these at runtime in v0.9 — Phase B (full
// RAG) will ingest them.

interface KbDoc {
  label: string;
  url: string;
  origin: 'WHO' | 'NTP' | 'CDC' | 'StopTB' | 'SCH';
  language: 'EN' | 'MY' | 'EN/MY';
  note?: string;
}

// Drive file IDs taken from sch-fc-sds-tb.md (project brain) +
// KZ's 2026-05-27 NoMs reply. Where SCH has a published web portal
// we link the portal; where they shared a specific PDF (and we
// uploaded to Drive) we link the Drive viewer URL.
const DRIVE_VIEW = (id: string) => `https://drive.google.com/file/d/${id}/view`;

const KB_DOCS: KbDoc[] = [
  // ---- WHO ----
  {
    label: 'WHO Operational Handbook on TB — Module 4 (Treatment & Care, 2025)',
    url: DRIVE_VIEW('19PivzmxWA8FhSWS5hHO_ozRFMXp7MV3m'),
    origin: 'WHO',
    language: 'EN',
    note: 'Primary KB for P3: adherence + side-effects + counselling. Ch3 §4.',
  },
  {
    label: 'WHO Consolidated Guidelines — Module 4 (Treatment & Care, 2025)',
    url: DRIVE_VIEW('1QNfCrY6ft0iAcKmJLqtKA1vPafMvffkh'),
    origin: 'WHO',
    language: 'EN',
    note: 'Treatment recommendations companion to the Op Handbook.',
  },
  {
    label: 'WHO Op Handbook — Module 2 (Screening)',
    url: 'https://www.who.int/publications/i/item/9789240022614',
    origin: 'WHO',
    language: 'EN',
    note: 'Used for P1 self-check rules (mostly).',
  },
  {
    label: 'WHO TPT Module 1 (Prevention)',
    url: 'https://www.who.int/publications/i/item/9789240096196',
    origin: 'WHO',
    language: 'EN',
  },
  {
    label: 'WHO guardrails (tbksp node 3046)',
    url: 'https://tbksp.who.int/en/node/3046',
    origin: 'WHO',
    language: 'EN',
    note: 'Counselling guardrails reference — what the bot should / should not say.',
  },

  // ---- Myanmar NTP ----
  {
    label: 'Myanmar NTP — SOPs and Guidelines (portal)',
    url: 'https://ntpmyanmar.org/publication/sop-guideline-2/',
    origin: 'NTP',
    language: 'EN/MY',
  },
  {
    label: 'Myanmar NTP — DR-TB National Guidelines DRAFT v5.2.3 (Mar 2025)',
    url: DRIVE_VIEW('1M8bslcE02lueAeeqYat1Dr6Jm4dmPHCz'),
    origin: 'NTP',
    language: 'EN',
    note: 'Local context for DR-TB regimens + monitoring.',
  },
  {
    label: 'Myanmar NTP — Health Education / Public Materials (portal)',
    url: 'https://ntpmyanmar.org/',
    origin: 'NTP',
    language: 'MY',
  },

  // ---- CDC ----
  {
    label: 'CDC — Questions and Answers About Tuberculosis (booklet)',
    url: 'https://www.cdc.gov/tb/media/Question_Answers_About_TB_English.pdf',
    origin: 'CDC',
    language: 'EN',
    note: 'FAQ patterns.',
  },

  // ---- Stop TB ----
  {
    label: 'Stop TB Partnership — FAQ',
    url: 'https://www.stoptb.org/who-we-are/frequently-asked-questions',
    origin: 'StopTB',
    language: 'EN',
  },

  // ---- SCH-provided ----
  {
    label: 'SCH-provided TB References (KZ 2026-05-27) — Drive folder',
    url: 'https://drive.google.com/drive/folders/1UuWV7XDhROWRFpf4ofOYW6yKVtYjZ0pM',
    origin: 'SCH',
    language: 'EN/MY',
    note: 'The folder SCH actively populates — check here for newer additions.',
  },
];

const ORIGIN_STYLE: Record<KbDoc['origin'], string> = {
  WHO: 'bg-blue-500/20 text-blue-300',
  NTP: 'bg-emerald-500/20 text-emerald-300',
  CDC: 'bg-purple-500/20 text-purple-300',
  StopTB: 'bg-amber-500/20 text-amber-300',
  SCH: 'bg-pink-500/20 text-pink-300',
};

export default function P3KbLinks() {
  return (
    <div className="px-3 py-2 bg-gray-800/40 space-y-1">
      <div className="text-[9px] text-gray-500 leading-relaxed mb-1">
        Sources SCH pointed us to (KZ 2026-05-27 NoMs reply).
        Phase B will ingest these into RAG. For now they&apos;re
        browseable references for reviewers + clinicians.
      </div>
      {KB_DOCS.map(d => (
        <a
          key={d.url}
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          title={d.note ? `${d.label}\n\n${d.note}` : d.label}
          className="flex flex-col gap-0.5 text-[10px] text-blue-300 hover:text-blue-200 hover:bg-gray-700/30 px-1.5 py-1 rounded leading-snug"
        >
          <div className="flex items-center gap-1.5">
            <span className={`text-[8px] uppercase tracking-wide px-1 rounded ${ORIGIN_STYLE[d.origin]}`}>{d.origin}</span>
            <span className={`text-[8px] uppercase tracking-wide px-1 rounded bg-gray-700/40 text-gray-300`}>{d.language}</span>
            <span className="opacity-70 ml-auto">↗</span>
          </div>
          <div className="text-gray-200 truncate" title={d.label}>{d.label}</div>
        </a>
      ))}
    </div>
  );
}
