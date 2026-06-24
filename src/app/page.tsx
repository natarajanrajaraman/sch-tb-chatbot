'use client';

import { useState, useEffect, useCallback } from 'react';
import ChatWindow from '@/components/ChatWindow';
import TranslationPanel from '@/components/TranslationPanel';
import FeedbackPanel from '@/components/FeedbackPanel';
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
  const [translationOpen, setTranslationOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [session, setSession] = useState<SessionData>(createInitialSession(DEFAULT_PLATFORM));
  const [conversationState, setConversationState] = useState<ConversationState>('LANDING');
  const [mounted, setMounted] = useState(false);

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
  }, [platform]);

  if (!mounted) return null;

  return (
    <div className="h-screen flex bg-gray-900 overflow-hidden relative">
      {/* LEFT: Clean device mockup */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-700 flex flex-col transition-all duration-300"
          style={{
            backgroundColor: theme.chatBg,
            maxWidth: theme.frameWidth,
            maxHeight: theme.frameHeight,
            height: '100%',
          }}
        >
          <ChatWindow
            theme={theme}
            messages={messages}
            setMessages={setMessages}
            session={session}
            setSession={setSession}
            conversationState={conversationState}
            setConversationState={setConversationState}
          />
        </div>
      </div>

      {/* Toggle tab for debug panel */}
      <button
        onClick={() => setDebugPanelOpen(!debugPanelOpen)}
        className="absolute top-1/2 -translate-y-1/2 right-0 z-30 bg-yellow-400/80 text-yellow-900/70 px-1 py-3 text-[9px] font-bold rounded-l hover:bg-yellow-400 transition-colors"
        style={{ writingMode: 'vertical-rl', right: debugPanelOpen ? '320px' : '0' }}
      >
        {debugPanelOpen ? 'CLOSE' : 'DEBUG'}
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

            {/* Controls section */}
            <div className="px-3 py-2.5 border-b border-gray-700/30 bg-gray-800/60 space-y-2.5 shrink-0">
              {/* Platform skin */}
              <div>
                <div className="text-[9px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Platform Skin</div>
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

              {/* Actions row */}
              <div className="flex gap-2">
                <button
                  onClick={handleRestart}
                  className="flex-1 py-1 bg-red-600/70 text-white text-[10px] font-medium rounded hover:bg-red-700 transition-colors"
                >
                  Restart Conversation
                </button>
                <a
                  href="/admin"
                  className="px-3 py-1 bg-gray-600/60 text-gray-300 text-[10px] font-medium rounded hover:bg-gray-600 transition-colors text-center"
                >
                  Admin
                </a>
              </div>
            </div>

            {/* English translation toggle + panel */}
            <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
              <button
                onClick={() => setTranslationOpen(!translationOpen)}
                className={`px-3 py-1.5 text-[10px] font-medium tracking-wider uppercase text-left border-b border-gray-700/30 transition-colors shrink-0 ${
                  translationOpen
                    ? 'bg-blue-900/30 text-blue-300'
                    : 'bg-gray-800/40 text-gray-500 hover:text-gray-300 hover:bg-gray-800/60'
                }`}
              >
                {translationOpen ? '▾' : '▸'} English Translation
              </button>

              {translationOpen && (
                <div className="flex-1 min-h-0 overflow-hidden">
                  <TranslationPanel messages={messages} />
                </div>
              )}
            </div>

            {/* Feedback always visible at bottom */}
            <div className="shrink-0">
              <FeedbackPanel
                conversationId={session.conversationId}
                platformView={platform}
                messages={messages}
                conversationState={conversationState}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
