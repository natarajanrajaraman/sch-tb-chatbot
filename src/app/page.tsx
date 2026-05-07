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
      {/* Watermark Banner */}
      <div className="bg-yellow-400 text-yellow-900 text-center py-2 px-4 text-sm font-bold tracking-widest uppercase z-50 relative">
        ⚠️ PROTOTYPE — FOR INTERNAL TESTING ONLY ⚠️
      </div>

      {/* Top Bar */}
      <div className="bg-gray-800 text-white flex items-center justify-between px-4 py-2 z-40">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold hidden sm:block">TB Screening Chatbot</h1>
          <PlatformToggle currentPlatform={platform} onPlatformChange={handlePlatformChange} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRestart}
            className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors"
          >
            🔄 Clear &amp; Restart
          </button>
          <a
            href="/admin"
            className="px-3 py-1.5 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-500 transition-colors"
          >
            👤 Admin
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Phone Frame Container */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div
            className="w-full max-w-[420px] h-full max-h-[700px] rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-700 flex flex-col relative"
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
            <FeedbackPanel conversationId={session.conversationId} platformView={platform} />
          </div>
        </div>

        {/* Translation Panel */}
        <TranslationPanel
          messages={messages}
          isOpen={translationOpen}
          onToggle={() => setTranslationOpen(!translationOpen)}
        />
      </div>
    </div>
  );
}
