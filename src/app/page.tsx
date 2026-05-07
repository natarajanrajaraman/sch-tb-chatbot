'use client';

import { useState, useEffect, useCallback } from 'react';
import ChatWindow from '@/components/ChatWindow';
import TranslationPanel from '@/components/TranslationPanel';
import PlatformToggle from '@/components/PlatformToggle';
import FeedbackPanel from '@/components/FeedbackPanel';
import { PlatformType, PLATFORM_THEMES } from '@/data/platformThemes';
import {
  Message,
  ConversationState,
  SessionData,
  getWelcomeMessage,
  createInitialSession,
} from '@/lib/chatEngine';

export default function Home() {
  const [platform, setPlatform] = useState<PlatformType>('messenger');
  const [translationOpen, setTranslationOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [session, setSession] = useState<SessionData>(createInitialSession('messenger'));
  const [conversationState, setConversationState] = useState<ConversationState>('WELCOME');
  const [mounted, setMounted] = useState(false);

  const theme = PLATFORM_THEMES[platform];

  useEffect(() => {
    setMounted(true);
    const welcomeMsg = getWelcomeMessage();
    setMessages([welcomeMsg]);
  }, []);

  const handlePlatformChange = (newPlatform: PlatformType) => {
    setPlatform(newPlatform);
    setSession(prev => ({ ...prev, platformView: newPlatform }));
  };

  const handleRestart = useCallback(() => {
    const newSession = createInitialSession(platform);
    setSession(newSession);
    setConversationState('WELCOME');
    setMessages([getWelcomeMessage()]);
  }, [platform]);

  if (!mounted) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-900 overflow-hidden">
      {/* Watermark Banner - minimal */}
      <div className="bg-yellow-400/80 text-yellow-900/70 text-center py-0.5 px-2 text-[9px] font-medium tracking-wider uppercase z-50">
        PROTOTYPE — FOR INTERNAL TESTING ONLY
      </div>

      {/* Top Bar */}
      <div className="bg-gray-800 text-white flex items-center justify-between px-3 py-1 z-40">
        <div className="flex items-center gap-2">
          <PlatformToggle currentPlatform={platform} onPlatformChange={handlePlatformChange} />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRestart}
            className="px-2 py-0.5 bg-red-600/80 text-white text-[10px] rounded hover:bg-red-700 transition-colors"
          >
            🔄 Restart
          </button>
          <a
            href="/admin"
            className="px-2 py-0.5 bg-gray-600 text-white text-[10px] rounded hover:bg-gray-500 transition-colors"
          >
            Admin
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Phone Frame Container */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div
            className="w-full max-w-[420px] h-full max-h-[700px] rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-700 flex flex-col"
            style={{ backgroundColor: theme.chatBg }}
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

        {/* Right Side: Translation + Feedback */}
        <div className={`flex flex-col transition-all duration-300 ${translationOpen ? 'w-[280px]' : 'w-0'}`}>
          {/* Toggle Button */}
          <button
            onClick={() => setTranslationOpen(!translationOpen)}
            className="absolute top-12 right-0 z-20 bg-gray-600/60 text-white/70 px-1 py-2 text-[9px] rounded-l hover:bg-gray-600 transition-colors"
            style={{ writingMode: 'vertical-rl' }}
          >
            {translationOpen ? '✕' : 'EN'}
          </button>

          {translationOpen && (
            <>
              <TranslationPanel messages={messages} />
              <FeedbackPanel conversationId={session.conversationId} platformView={platform} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
