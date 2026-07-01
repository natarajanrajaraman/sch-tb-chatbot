'use client';

import { useState, useEffect, useCallback } from 'react';
import ChatWindow from '@/components/ChatWindow';
import TranslationPanel from '@/components/TranslationPanel';
import FeedbackPanel from '@/components/FeedbackPanel';
import WorkflowFlowchart from '@/components/WorkflowFlowchart';
import CollapsibleSection from '@/components/CollapsibleSection';
import P3ChatPanel, { P3UsageSnapshot, P3Msg } from '@/components/p3/P3ChatPanel';
import P3CostMeter from '@/components/p3/P3CostMeter';
import P3DocLinks from '@/components/p3/P3DocLinks';
import P3SystemPromptEditor from '@/components/p3/P3SystemPromptEditor';
import P3KbLinks from '@/components/p3/P3KbLinks';
import { DEFAULT_MODEL_ID } from '@/lib/p3/models';
import { PlatformType, PLATFORM_THEMES, PLATFORM_ORDER } from '@/data/platformThemes';
import {
  Message,
  ConversationState,
  SessionData,
  getWelcomeMessage,
  createInitialSession,
  BOT_VERSION,
} from '@/lib/chatEngine';
import { setOverrides } from '@/lib/textRegistry';
import { setLocations } from '@/lib/locationRegistry';
import { LOCATION_SEED } from '@/data/locationSeed';

const DEFAULT_PLATFORM: PlatformType = 'viber';

export default function Home() {
  const [platform, setPlatform] = useState<PlatformType>(DEFAULT_PLATFORM);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  // English Translation defaults to OPEN per v0.9.2 layout spec.
  const [translationOpen, setTranslationOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [session, setSession] = useState<SessionData>(createInitialSession(DEFAULT_PLATFORM));
  const [conversationState, setConversationState] = useState<ConversationState>('LANDING');
  const [mounted, setMounted] = useState(false);

  // P3 (Patient Info chatbot) state — surfaces in debug panel
  const [p3ModelId, setP3ModelId] = useState<string>(DEFAULT_MODEL_ID);
  const [p3ResetSignal, setP3ResetSignal] = useState(0);
  const [p3Messages, setP3Messages] = useState<P3Msg[]>([]);
  const [p3SystemPromptOverride, setP3SystemPromptOverride] = useState<string | null>(null);
  const [p3Usage, setP3Usage] = useState<P3UsageSnapshot>({
    modelId: DEFAULT_MODEL_ID,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    estCostUsd: 0,
    lastEscalationLevel: 'none',
    escalationsCount: 0,
    careReferralIds: [],
  });

  const theme = PLATFORM_THEMES[platform];

  useEffect(() => {
    let cancelled = false;
    setMounted(true);
    // Seed locations from bundled defaults so the cascade works even if the
    // sheet hasn't been populated yet — the live fetch overrides this below.
    setLocations(LOCATION_SEED);
    (async () => {
      try {
        const [mapRes, locRes] = await Promise.all([
          fetch('/api/language-map', { cache: 'no-store' }),
          fetch('/api/locations', { cache: 'no-store' }),
        ]);
        if (mapRes.ok) {
          const data = await mapRes.json();
          if (!cancelled && data?.map) setOverrides(data.map);
        }
        if (locRes.ok) {
          const data = await locRes.json();
          if (!cancelled && Array.isArray(data?.rows) && data.rows.length > 0) {
            setLocations(data.rows);
          }
        }
      } catch {
        // Fall back to bundled defaults
      } finally {
        if (!cancelled) {
          setMessages([getWelcomeMessage()]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePlatformChange = (newPlatform: PlatformType) => {
    setPlatform(newPlatform);
    setSession(prev => ({ ...prev, platformView: newPlatform }));
  };

  const handleRestart = useCallback(() => {
    const newSession = createInitialSession(platform);
    setSession(newSession);
    setConversationState('LANDING');
    setMessages([getWelcomeMessage()]);
    setP3ResetSignal(s => s + 1);
  }, [platform]);

  const isP3Mode = session.landingChoice === '2';

  if (!mounted) return null;

  // v1.8.0 — flatten the translation channel data once so we can pass
  // it to the drawer below without duplicating the mapping.
  const translationMessages = isP3Mode
    ? p3Messages.map(m => ({
        id: m.id,
        sender: (m.role === 'user' ? 'user' : 'bot') as 'user' | 'bot',
        textMm: m.textMm,
        textEn: m.textEn,
        timestamp: m.ts,
      }))
    : messages;

  return (
    <div className="h-screen flex bg-gray-900 overflow-hidden relative">
      {/* v1.8.0 — DASHBOARDS strip on the far left.
          Mirrors the SpeedbackShell sidebar so role-switching is a
          single click without opening the dev panel. */}
      <aside className="w-14 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-3 gap-1.5 shrink-0">
        <div className="text-[7px] uppercase tracking-wider text-slate-500 mb-1 font-semibold">Roles</div>
        <a href="/admin" title="SCH Admin View" className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800/70 hover:bg-slate-700 text-lg leading-none">🤓</a>
        <a href="/telehealth" title="SCH Tele-Health View" className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800/70 hover:bg-slate-700 text-lg leading-none">🎧</a>
        {/* DISABLED 2026-07-01 per Raj — Screening Provider + Care Provider views hidden from the interface.
            Routes, role logic and schemas are intact; re-enable by uncommenting these two links (and the
            matching NAV_ITEMS entries in SpeedbackShell.tsx).
        <a href="/screening-provider" title="TB Screening Provider View" className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800/70 hover:bg-slate-700 text-lg leading-none">🩻</a>
        <a href="/care-provider" title="TB Care Provider View" className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800/70 hover:bg-slate-700 text-lg leading-none">🩺</a>
        */}
      </aside>

      {/* CENTER: Clean device mockup + floating restart button below */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3 min-h-0">
        <div
          className="w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-700 flex flex-col transition-all duration-300"
          style={{
            backgroundColor: theme.chatBg,
            maxWidth: theme.frameWidth,
            maxHeight: theme.frameHeight,
            flex: '1 1 0',
            minHeight: 0,
          }}
        >
          {isP3Mode ? (
            <P3ChatPanel
              theme={theme}
              modelId={p3ModelId}
              platformView={platform}
              systemPromptOverride={p3SystemPromptOverride}
              onUsageChange={setP3Usage}
              onMessagesChange={setP3Messages}
              onResetSignal={p3ResetSignal}
            />
          ) : (
            <ChatWindow
              theme={theme}
              messages={messages}
              setMessages={setMessages}
              session={session}
              setSession={setSession}
              conversationState={conversationState}
              setConversationState={setConversationState}
            />
          )}
        </div>

        {/* Floating Restart Conversation button — moved out of the
            debug panel in v0.9.2 so testers can reset without
            opening the panel. */}
        <button
          onClick={handleRestart}
          className="px-4 py-2 bg-red-600/90 text-white text-xs font-medium rounded-full shadow-lg hover:bg-red-700 transition-colors shrink-0"
          title="Wipe the current chat state and start a fresh conversation. P3 conversation ID + token counters also reset."
        >
          ↻ Restart Conversation
        </button>
      </div>

      {/* v1.8.0 — Translation pop-out drawer (between the chat and the
          dev panel). Tab handle sits on the LEFT edge of this drawer,
          so when closed it appears at the right edge of the chat. */}
      <button
        onClick={() => setTranslationOpen(!translationOpen)}
        className="absolute top-[35%] -translate-y-1/2 z-30 bg-blue-700/80 text-blue-50 px-1 py-3 text-[9px] font-bold rounded-l hover:bg-blue-700 transition-colors"
        style={{
          writingMode: 'vertical-rl',
          right: (translationOpen ? 320 : 0) + (debugPanelOpen ? 320 : 0),
        }}
        title={translationOpen ? 'Hide English translation panel' : 'Open the English translation panel (read what each Burmese message says)'}
      >
        {translationOpen ? '◀ HIDE EN' : 'EN ▶'}
      </button>
      <div
        className={`flex flex-col border-l border-gray-700/50 bg-slate-800/80 overflow-hidden transition-all duration-300 ${
          translationOpen ? 'w-[320px]' : 'w-0 border-l-0'
        }`}
      >
        {translationOpen && (
          <>
            <div className="bg-blue-900/30 text-blue-300 px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase shrink-0 border-b border-gray-700/30">
              English Translation
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <TranslationPanel messages={translationMessages} />
            </div>
          </>
        )}
      </div>

      {/* Toggle tab for dev panel (was: debug) */}
      <button
        onClick={() => setDebugPanelOpen(!debugPanelOpen)}
        className="absolute top-1/2 -translate-y-1/2 right-0 z-30 bg-yellow-400/80 text-yellow-900/70 px-1 py-3 text-[9px] font-bold rounded-l hover:bg-yellow-400 transition-colors"
        style={{ writingMode: 'vertical-rl', right: debugPanelOpen ? '320px' : '0' }}
        title={debugPanelOpen ? 'Close the Dev / tester panel' : 'Open the Dev / tester panel (model picker, cost meter, KB, feedback)'}
      >
        {debugPanelOpen ? 'CLOSE' : 'DEV'}
      </button>

      {/* RIGHT: Debug panel */}
      <div
        className={`flex flex-col border-l border-gray-700/50 bg-gray-800/80 overflow-hidden transition-all duration-300 ${
          debugPanelOpen ? 'w-[320px]' : 'w-0 border-l-0'
        }`}
      >
        {debugPanelOpen && (
          <>
            {/* Panel header */}
            <div className="bg-yellow-400/80 text-yellow-900/70 text-center py-1 px-2 text-[9px] font-bold tracking-wider uppercase shrink-0">
              PROTOTYPE v{BOT_VERSION} — FOR INTERNAL TESTING ONLY
            </div>

            {/* Sections collapsible per v0.9.2 layout spec. */}
            <div className="flex flex-col min-h-0 flex-1 overflow-y-auto">

              {/* Workflow position — expanded by default */}
              <CollapsibleSection title="Workflow position" defaultOpen={true}>
                <WorkflowFlowchart state={conversationState} session={session} />
              </CollapsibleSection>

              {/* P3 cost meter + model picker — shown in P3 mode only */}
              {isP3Mode && (
                <CollapsibleSection title="P3 LLM cost meter" defaultOpen={true}>
                  <P3CostMeter
                    modelId={p3ModelId}
                    onModelChange={setP3ModelId}
                    usage={p3Usage}
                    onReset={() => setP3ResetSignal(s => s + 1)}
                    visible={true}
                  />
                </CollapsibleSection>
              )}

              {/* P3 system prompt hot-edit — only meaningful in P3 mode */}
              {isP3Mode && (
                <P3SystemPromptEditor
                  override={p3SystemPromptOverride}
                  onOverrideChange={setP3SystemPromptOverride}
                />
              )}

              {/* P3 KB Links — collapsed by default, sits right below the
                  system prompt editor as Raj requested. */}
              {isP3Mode && (
                <CollapsibleSection title="P3 Knowledge Base Links" defaultOpen={false}>
                  <P3KbLinks />
                </CollapsibleSection>
              )}

              {/* Platform skin — collapsed by default */}
              <CollapsibleSection title="Platform Skin" defaultOpen={false}>
                <div className="px-3 py-2 bg-gray-800/60">
                  <div className="flex gap-1">
                    {PLATFORM_ORDER.map((p) => {
                      const t = PLATFORM_THEMES[p];
                      const isActive = p === platform;
                      return (
                        <button
                          key={p}
                          onClick={() => handlePlatformChange(p)}
                          className={`flex-1 py-1 rounded text-[10px] font-medium transition-all ${
                            isActive
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'bg-gray-700/40 text-gray-400 hover:text-gray-200 hover:bg-gray-700/60'
                          }`}
                        >
                          {t.headerIcon} {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CollapsibleSection>

              {/* v1.8.0 — English Translation and Dashboards moved OUT
                  of the dev panel. The translation lives as a pop-out
                  drawer to the right of the chat; the dashboards live
                  as a fixed strip on the left of the chat. */}

              {/* Docs (GitHub web view) — collapsed by default */}
              <CollapsibleSection title="Docs (GitHub web view)" defaultOpen={false}>
                <P3DocLinks />
              </CollapsibleSection>

              {/* Tester feedback — expanded by default */}
              <CollapsibleSection title="Tester Feedback" defaultOpen={true}>
                <FeedbackPanel
                  conversationId={session.conversationId}
                  platformView={platform}
                  messages={messages}
                  conversationState={conversationState}
                />
              </CollapsibleSection>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
