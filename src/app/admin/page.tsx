'use client';

import { useState, useEffect, useCallback } from 'react';
import AuthGate from '@/components/AuthGate';
import SpeedbackShell from '@/components/SpeedbackShell';
import CascadeFunnel, { CascadeNode } from '@/components/dashboard/CascadeFunnel';
import ScreeningReferralLogTable from '@/components/dashboard/ScreeningReferralLogTable';
import OutcomeCards from '@/components/dashboard/OutcomeCards';
import StageBreakdownTable from '@/components/dashboard/StageBreakdownTable';
import { computeSelfCheckJourney, computePatientSupportJourney } from '@/lib/journeyState';

type TabType = 'dashboard' | 'sessions' | 'feedback' | 'referral-log' | 'care-referral-log';

const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1WNOvqyienkQNjF5ECUIPq5w30qaAVDQe0cuJrBv2P6w';

interface DashboardStats {
  // TB Self-Check (P1) stats
  totalSelfChecks: number;
  completedScreenings: number;
  presumptiveTB: number;
  negHighRisk: number;
  notPresumptiveTB: number;
  assistedReferrals: number;
  selfReferrals: number;
  under15Excluded: number;
  presumptiveRate: string;
  // TB Patient Support (P3) stats
  totalP3Conversations: number;
  p3WithEscalation: number;
  careReferralsTotal: number;
  careContacted: number;
  careInCareOrClosed: number;
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
  const [aiConversations, setAiConversations] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [byProvider, setByProvider] = useState<ProviderSummary[]>([]);
  const [selfCheckCascade, setSelfCheckCascade] = useState<CascadeNode | null>(null);
  const [patientSupportCascade, setPatientSupportCascade] = useState<CascadeNode | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sessRes, fbRes, refRes, careRes, p3Res] = await Promise.all([
        fetch('/api/session'),
        fetch('/api/feedback'),
        fetch('/api/referral-log'),
        fetch('/api/care-referral-log'),
        fetch('/api/p3/conversation'),
      ]);
      const sessData = await sessRes.json();
      const fbData = await fbRes.json();
      const refData = await refRes.json();
      const careData = await careRes.json();
      const p3Data = await p3Res.json();

      setSessions(sessData.data || []);
      setFeedback(fbData.data || []);
      setReferralLogs(refData.data || []);
      setCareReferralLogs(careData.data || []);
      setAiConversations(p3Data.data || []);

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

      // ------- Cascade A: TB Self-Check (P1) — join Sessions to Screening Referral Log on screeningId
      const screeningRows = (refData.data || []).slice(1) as string[][];
      const screeningHeaders = ((refData.data || [])[0] || []) as string[];
      const rCol = (n: string) => screeningHeaders.findIndex(h => h === n);
      const r_screeningId = rCol('screeningId');
      const r_clientContacted = rCol('clientContacted');
      const r_contactAttempts = rCol('contactAttempts');
      const r_arrivedAtCenter = rCol('arrivedAtCenter');
      const r_cxrCompleted = rCol('cxrCompleted');
      const r_cxrResult = rCol('cxrResult');
      const r_xpertCompleted = rCol('xpertCompleted');
      const r_xpertResult = rCol('xpertResult');
      const r_patientDx = rCol('patientDx');
      const r_firstContactSP = rCol('firstContactScreeningProviderDate');

      const screeningById = new Map<string, string[]>();
      for (const sr of screeningRows) {
        const id = (sr[r_screeningId] || '').trim();
        if (id) screeningById.set(id, sr);
      }

      const cScreeningId = col('screeningId');
      const cLandingChoice = col('landingChoice');

      // Total self-checks = landingChoice='1' OR (legacy rows without landingChoice).
      // Legacy rows pre-v0.4 are all P1, so we include them.
      const selfCheckRows = rows.filter(r => {
        const lc = cLandingChoice >= 0 ? (r[cLandingChoice] || '').trim() : '';
        return lc === '1' || lc === '';
      });
      const presumptiveSC = selfCheckRows.filter(r => readCol(r, cClassification, LEGACY_COLS.classification) === 'Presumptive TB');

      function hasScreeningSignal(r: string[], pred: (sr: string[]) => boolean): boolean {
        const sid = cScreeningId >= 0 ? (r[cScreeningId] || '').trim() : '';
        const sr = sid ? screeningById.get(sid) : undefined;
        return sr ? pred(sr) : false;
      }

      const assistedSC = presumptiveSC.filter(r => readCol(r, cReferralType, LEGACY_COLS.referralType) === 'Assisted');
      const selfSC = presumptiveSC.filter(r => readCol(r, cReferralType, LEGACY_COLS.referralType) === 'Self');

      const isContactedSr = (sr: string[]) =>
        (sr[r_clientContacted] || '').trim() === 'Yes' ||
        (parseInt((sr[r_contactAttempts] || '0').trim(), 10) || 0) > 0;
      const isReachedSr = (sr: string[]) => {
        const arrived = (sr[r_arrivedAtCenter] || '').trim() === 'Yes';
        const fcsp = (sr[r_firstContactSP] || '').trim();
        const dx = (sr[r_patientDx] || '').trim();
        return arrived || !!fcsp || dx === 'Confirmed TB +ve' || dx === 'Confirmed TB -ve';
      };
      const isTestedSr = (sr: string[]) =>
        (sr[r_cxrCompleted] || '').trim() === 'Yes' ||
        (sr[r_xpertCompleted] || '').trim() === 'Yes' ||
        !!(sr[r_cxrResult] || '').trim() ||
        !!(sr[r_xpertResult] || '').trim();
      const isTbPosSr = (sr: string[]) => {
        const dx = (sr[r_patientDx] || '').trim();
        const cxr = (sr[r_cxrResult] || '').trim();
        return dx === 'Confirmed TB +ve' || cxr === '+ve';
      };

      const assistedContactedSC = assistedSC.filter(r => hasScreeningSignal(r, isContactedSr));
      const assistedReachedSC = assistedSC.filter(r => hasScreeningSignal(r, isReachedSr));
      const assistedTestedSC = assistedSC.filter(r => hasScreeningSignal(r, isTestedSr));
      const assistedTbPosSC = assistedSC.filter(r => hasScreeningSignal(r, isTbPosSr));

      // Self path skips the Tele-Health contact step
      const selfReachedSC = selfSC.filter(r => hasScreeningSignal(r, isReachedSr));
      const selfTestedSC = selfSC.filter(r => hasScreeningSignal(r, isTestedSr));
      const selfTbPosSC = selfSC.filter(r => hasScreeningSignal(r, isTbPosSr));

      const scCascade: CascadeNode = {
        label: 'Total self-checks',
        caption: 'Sessions where landingChoice = 1 (or legacy P1 rows)',
        count: selfCheckRows.length,
        children: [
          {
            label: 'Presumptive TB classification',
            count: presumptiveSC.length,
            children: [
              {
                label: 'Assisted referrals',
                count: assistedSC.length,
                children: [
                  {
                    label: 'Contacted by Tele-Health',
                    caption: 'clientContacted = Yes OR contactAttempts > 0',
                    count: assistedContactedSC.length,
                    children: [
                      {
                        label: 'Reached screening provider',
                        caption: 'arrivedAtCenter = Yes OR firstContactScreeningProviderDate set OR Dx set',
                        count: assistedReachedSC.length,
                        children: [
                          {
                            label: 'Tests resulted (CXR / Xpert)',
                            count: assistedTestedSC.length,
                            children: [
                              { label: 'Diagnosed TB-positive', count: assistedTbPosSC.length },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                label: 'Self referrals',
                count: selfSC.length,
                children: [
                  {
                    label: 'Reached screening provider',
                    caption: 'arrivedAtCenter = Yes OR firstContactScreeningProviderDate set OR Dx set',
                    count: selfReachedSC.length,
                    children: [
                      {
                        label: 'Tests resulted (CXR / Xpert)',
                        count: selfTestedSC.length,
                        children: [
                          { label: 'Diagnosed TB-positive', count: selfTbPosSC.length },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      setSelfCheckCascade(scCascade);

      // ------- Cascade B: TB Patient Support (P3) — join AI Conversations to Care Referral Log
      const careRows = (careData.data || []).slice(1) as string[][];
      const careHeaders = ((careData.data || [])[0] || []) as string[];
      const cCol = (n: string) => careHeaders.findIndex(h => h === n);
      const ca_careReferralId = cCol('careReferralId');
      const ca_status = cCol('status');
      const ca_patientContact = cCol('patientContact');

      const careById = new Map<string, string[]>();
      for (const cr of careRows) {
        const id = (cr[ca_careReferralId] || '').trim();
        if (id) careById.set(id, cr);
      }

      const aiRows = (p3Data.data || []).slice(1) as string[][];
      const aiHeaders = ((p3Data.data || [])[0] || []) as string[];
      const aCol = (n: string) => aiHeaders.findIndex(h => h === n);
      const a_escalationsCount = aCol('escalationsCount');
      const a_careReferralIds = aCol('careReferralIds');

      const p3Escalated = aiRows.filter(r => (parseInt((r[a_escalationsCount] || '0').trim(), 10) || 0) > 0);

      // Care referrals = each careReferralId mentioned by an AI Conversations row,
      // joined to its Care Referral Log row (if present).
      const careReferralIdsFromP3 = new Set<string>();
      for (const r of aiRows) {
        const ids = (r[a_careReferralIds] || '').split(',').map(s => s.trim()).filter(Boolean);
        ids.forEach(id => careReferralIdsFromP3.add(id));
      }
      const careRefs = [...careReferralIdsFromP3];
      const careRefsContacted = careRefs.filter(id => {
        const cr = careById.get(id);
        if (!cr) return false;
        const status = (cr[ca_status] || '').trim();
        return status === 'Contacted' || !!(cr[ca_patientContact] || '').trim();
      });
      const careRefsReached = careRefs.filter(id => {
        const cr = careById.get(id);
        if (!cr) return false;
        const status = (cr[ca_status] || '').trim();
        return status === 'In Care' || status === 'Closed';
      });

      const psCascade: CascadeNode = {
        label: 'Total patient-support conversations',
        caption: 'AI Conversations rows (P3 LLM chats)',
        count: aiRows.length,
        children: [
          {
            label: 'Triggered an escalation',
            caption: 'escalationsCount > 0',
            count: p3Escalated.length,
            children: [
              {
                label: 'Care referrals (Assisted or Self)',
                caption: 'careReferralId minted on Care Referral Log',
                count: careRefs.length,
                children: [
                  {
                    label: 'Contacted by Tele-Health',
                    caption: 'status = Contacted OR patientContact captured',
                    count: careRefsContacted.length,
                    children: [
                      {
                        label: 'Reached TB Care Provider',
                        caption: 'status = In Care OR Closed',
                        count: careRefsReached.length,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      setPatientSupportCascade(psCascade);

      setStats({
        // Self-Check (P1)
        totalSelfChecks: selfCheckRows.length,
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
        // Patient Support (P3)
        totalP3Conversations: aiRows.length,
        p3WithEscalation: p3Escalated.length,
        careReferralsTotal: careRefs.length,
        careContacted: careRefsContacted.length,
        careInCareOrClosed: careRefsReached.length,
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
    <SpeedbackShell
      title="SCH Admin"
      subtitle={
        <>
          Database:{' '}
          <a
            href={SPREADSHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            SCH TB Chatbot - Database [PROTOTYPE] ↗
          </a>
        </>
      }
      activeView="admin"
      rightActions={
        <>
          <button
            onClick={fetchData}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 shadow-sm"
          >
            🔄 Refresh
          </button>
          <a
            href="/"
            className="px-3 py-1.5 bg-white text-slate-700 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            ← Back to Chat
          </a>
        </>
      }
    >

      {/* Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-4 px-2 flex gap-0 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading data...</div>
        ) : (
          <>
            {activeTab === 'dashboard' && stats && (
              <DashboardView
                stats={stats}
                byProvider={byProvider}
                selfCheckCascade={selfCheckCascade}
                patientSupportCascade={patientSupportCascade}
                referralLogs={referralLogs}
                careReferralLogs={careReferralLogs}
              />
            )}
            {activeTab === 'sessions' && <DataTable data={sessions} title="Sessions" />}
            {activeTab === 'feedback' && <DataTable data={feedback} title="Feedback" />}
            {activeTab === 'referral-log' && <ScreeningReferralLogTable data={referralLogs} onRefresh={fetchData} editable={true} userRole="admin" />}
            {activeTab === 'care-referral-log' && <DataTable data={careReferralLogs} title="Care Referral Log" />}
          </>
        )}
      </div>
    </SpeedbackShell>
  );
}

function DashboardView({
  stats, byProvider, selfCheckCascade, patientSupportCascade,
  referralLogs, careReferralLogs,
}: {
  stats: DashboardStats;
  byProvider: ProviderSummary[];
  selfCheckCascade: CascadeNode | null;
  patientSupportCascade: CascadeNode | null;
  referralLogs: string[][];
  careReferralLogs: string[][];
}) {
  // v1.6 — Per-record journey state for the two outcome cards.
  // v1.6.1 — filter empty rows so phantom blanks don't pollute the buckets.
  const screeningHeaders = referralLogs[0] || [];
  const screeningJourneys = referralLogs.slice(1)
    .map(r => computeSelfCheckJourney(r, screeningHeaders))
    .filter(j => !!j.recordId);
  const careHeaders = careReferralLogs[0] || [];
  const careJourneys = careReferralLogs.slice(1)
    .map(r => computePatientSupportJourney(r, careHeaders))
    .filter(j => !!j.recordId);

  const selfCheckCards = [
    { label: 'Total Self-Checks', value: stats.totalSelfChecks, color: 'bg-blue-500' },
    { label: 'Completed', value: stats.completedScreenings, color: 'bg-green-500' },
    { label: 'Presumptive TB', value: stats.presumptiveTB, color: 'bg-red-500' },
    { label: 'Negative (High Risk)', value: stats.negHighRisk, color: 'bg-amber-500' },
    { label: 'Not Presumptive', value: stats.notPresumptiveTB, color: 'bg-emerald-500' },
    { label: 'Presumptive Rate', value: stats.presumptiveRate, color: 'bg-orange-500' },
    { label: 'Assisted Referrals', value: stats.assistedReferrals, color: 'bg-purple-500' },
    { label: 'Self Referrals', value: stats.selfReferrals, color: 'bg-indigo-500' },
    { label: 'Under 15 Excluded', value: stats.under15Excluded, color: 'bg-gray-500' },
  ];

  const patientSupportCards = [
    { label: 'Total Conversations', value: stats.totalP3Conversations, color: 'bg-violet-500' },
    { label: 'With Escalation', value: stats.p3WithEscalation, color: 'bg-red-500' },
    { label: 'Care Referrals', value: stats.careReferralsTotal, color: 'bg-amber-500' },
    { label: 'Contacted by Tele-Health', value: stats.careContacted, color: 'bg-blue-500' },
    { label: 'Reached Care Provider', value: stats.careInCareOrClosed, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-10">
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1 — TB Self-Check (P1)
          ───────────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-3 border-b border-slate-200 pb-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">🔍 TB Self-Check</h2>
            <p className="text-sm text-slate-500">Self-screening flow (rule-based). Cascade joins Sessions to Screening Referral Log via screeningId.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {selfCheckCards.map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{card.label}</div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${card.color}`} />
                <div className="text-2xl font-bold text-slate-900">{card.value}</div>
              </div>
            </div>
          ))}
        </div>

        {selfCheckCascade && (
          <div className="mb-6">
            <CascadeFunnel
              title="Screening cascade"
              subtitle="Total → Presumptive → Referral type → Contacted → Reached → Tested → Diagnosed"
              root={selfCheckCascade}
              accent="blue"
            />
          </div>
        )}

        {/* v1.6 — Screening Referral outcome rollup + per-stage breakdown */}
        <div className="space-y-3 mb-6">
          <OutcomeCards
            title="Screening Referral"
            journeys={screeningJourneys}
          />
          <StageBreakdownTable title="Per-stage breakdown" journeys={screeningJourneys} />
        </div>

        {/* Referrals by destination provider / township */}
        <div>
          <h3 className="text-base font-bold text-slate-800 mb-2">Referrals by destination</h3>
          <p className="text-xs text-slate-500 mb-3">
            Grouped by destination facility · township from the Sessions sheet.
          </p>
          {byProvider.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center text-slate-400 text-sm">
              No referrals yet.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Destination</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Referrals</th>
                  </tr>
                </thead>
                <tbody>
                  {byProvider.map(p => (
                    <tr key={p.label} className="border-b last:border-b-0">
                      <td className="px-4 py-2 text-slate-700">{p.label}</td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-900">{p.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2 — TB Patient Support (P3)
          ───────────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-3 border-b border-slate-200 pb-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">🤝 TB Patient Support</h2>
            <p className="text-sm text-slate-500">LLM patient-info chatbot (P3). Cascade joins AI Conversations to Care Referral Log via careReferralId.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {patientSupportCards.map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{card.label}</div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${card.color}`} />
                <div className="text-2xl font-bold text-slate-900">{card.value}</div>
              </div>
            </div>
          ))}
        </div>

        {patientSupportCascade && (
          <div className="mb-6">
            <CascadeFunnel
              title="Patient-support cascade"
              subtitle="Total → Escalation → Care referral → Contacted → Reached care provider"
              root={patientSupportCascade}
              accent="violet"
            />
          </div>
        )}

        {/* v1.6 — Care Referral outcome rollup + per-stage breakdown */}
        <div className="space-y-3">
          <OutcomeCards
            title="Care Referral"
            journeys={careJourneys}
          />
          <StageBreakdownTable title="Per-stage breakdown" journeys={careJourneys} />
        </div>
      </section>

      {stats.totalSelfChecks === 0 && stats.totalP3Conversations === 0 && (
        <div className="text-center text-slate-400 py-8">
          No data yet. Complete a screening or P3 conversation in the chatbot to see data here.
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
