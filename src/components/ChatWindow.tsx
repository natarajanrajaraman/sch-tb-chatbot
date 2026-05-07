'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PlatformTheme } from '@/data/platformThemes';
import {
  Message,
  ConversationState,
  SessionData,
  processUserInput,
  getWelcomeMessage,
  createInitialSession,
  generateReferralLetter,
  generateId,
} from '@/lib/chatEngine';
import { BOT_MESSAGES } from '@/data/messages';

interface ChatWindowProps {
  theme: PlatformTheme;
  messages: Message[];
  setMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void;
  session: SessionData;
  setSession: (s: SessionData | ((prev: SessionData) => SessionData)) => void;
  conversationState: ConversationState;
  setConversationState: (s: ConversationState) => void;
}

export default function ChatWindow({
  theme,
  messages,
  setMessages,
  session,
  setSession,
  conversationState,
  setConversationState,
}: ChatWindowProps) {
  const [inputText, setInputText] = useState('');
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const addBotMessageWithDelay = useCallback((msg: Message) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev: Message[]) => [...prev, msg]);
    }, 600 + Math.random() * 400);
  }, [setMessages]);

  const handleSendMessage = useCallback(async (inputValue: string, displayMm?: string, displayEn?: string) => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      sender: 'user',
      textMm: displayMm || inputValue,
      textEn: displayEn || inputValue,
      timestamp: Date.now(),
    };
    setMessages((prev: Message[]) => [...prev, userMessage]);

    // Process through chat engine
    const result = processUserInput(
      conversationState,
      inputValue,
      session,
      conversationState === 'ASK_CONDITIONS' ? selectedConditions : undefined
    );

    setSession(result.updatedSession);
    setConversationState(result.nextState);
    setSelectedConditions([]);

    // Handle special states
    if (result.nextState === 'SYMPTOM_INTRO') {
      // Show intro then auto-advance to first question
      addBotMessageWithDelay(result.botMessage);
      setTimeout(() => {
        const firstQ = processUserInput('SYMPTOM_INTRO', '', result.updatedSession);
        addBotMessageWithDelay(firstQ.botMessage);
        setConversationState(firstQ.nextState);
      }, 1500);
      return;
    }

    if (result.nextState === 'SELF_RESULT') {
      // Fetch referral sites
      addBotMessageWithDelay({
        id: generateId(),
        sender: 'bot',
        textMm: '🔍 သင့်မြို့နယ်အနီးရှိ တီဘီစစ်ဆေးရေးစင်တာများ ရှာဖွေနေပါသည်...',
        textEn: '🔍 Searching for TB screening centers near your township...',
        timestamp: Date.now(),
      });

      try {
        const response = await fetch(`/api/referral-sites?township=${encodeURIComponent(result.updatedSession.referralTownship || '')}`);
        const data = await response.json();
        const sites = data.sites || [];

        let resultText: { mm: string; en: string };
        if (sites.length === 0) {
          resultText = {
            mm: BOT_MESSAGES.self_referral_no_match.mm,
            en: BOT_MESSAGES.self_referral_no_match.en,
          };
        } else {
          const siteListMm = sites.map((s: { facility_name_mm: string; facility_name: string; address: string; phone: string; services: string; operating_hours: string }, i: number) =>
            `${i + 1}. ${s.facility_name_mm || s.facility_name}\n   📍 ${s.address}\n   📞 ${s.phone}\n   🏥 ${s.services}\n   🕐 ${s.operating_hours}`
          ).join('\n\n');
          const siteListEn = sites.map((s: { facility_name: string; address: string; phone: string; services: string; operating_hours: string }, i: number) =>
            `${i + 1}. ${s.facility_name}\n   📍 ${s.address}\n   📞 ${s.phone}\n   🏥 ${s.services}\n   🕐 ${s.operating_hours}`
          ).join('\n\n');

          const letter = generateReferralLetter(result.updatedSession, sites[0].facility_name, result.updatedSession.referralTownship || '');

          resultText = {
            mm: BOT_MESSAGES.self_referral_result_header.mm + siteListMm + '\n' + BOT_MESSAGES.referral_letter_header.mm + '\n\n' + letter.mm,
            en: BOT_MESSAGES.self_referral_result_header.en + siteListEn + '\n' + BOT_MESSAGES.referral_letter_header.en + '\n\n' + letter.en,
          };

          result.updatedSession.referralSitesShown = sites.map((s: { site_id: string }) => s.site_id);
          setSession(result.updatedSession);
        }

        setTimeout(() => {
          const endOptions = [
            { id: 'new_screening', labelMm: 'ထပ်မံစစ်ဆေးမည်', labelEn: 'New Screening' },
            { id: 'other_questions', labelMm: 'အခြားမေးခွန်းများ', labelEn: 'Other Questions' },
            { id: 'end', labelMm: 'စကားပြောရပ်မည်', labelEn: 'End Conversation' },
          ];
          setMessages((prev: Message[]) => [...prev, {
            id: generateId(),
            sender: 'bot' as const,
            textMm: resultText.mm,
            textEn: resultText.en,
            timestamp: Date.now(),
            options: endOptions,
            optionType: 'single' as const,
          }]);
        }, 1500);
      } catch {
        setTimeout(() => {
          setMessages((prev: Message[]) => [...prev, {
            id: generateId(),
            sender: 'bot' as const,
            textMm: '❌ ဆာဗာနှင့် ဆက်သွယ်ရာတွင် အမှားတစ်ခု ဖြစ်ပွားပါသည်။',
            textEn: '❌ An error occurred while connecting to the server.',
            timestamp: Date.now(),
          }]);
        }, 1000);
      }
      return;
    }

    if (result.nextState === 'WELCOME' && conversationState !== 'WELCOME') {
      // New screening - reset messages
      setMessages([]);
      setTimeout(() => {
        setMessages([result.botMessage]);
      }, 300);
      return;
    }

    addBotMessageWithDelay(result.botMessage);

    // Save session to backend
    if (result.updatedSession.status === 'completed') {
      try {
        await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.updatedSession),
        });
      } catch {
        // Silently fail for prototype
      }
    }
  }, [conversationState, session, selectedConditions, addBotMessageWithDelay, setMessages, setSession, setConversationState]);

  const handleOptionClick = (optionId: string, labelMm: string, labelEn: string) => {
    if (conversationState === 'ASK_CONDITIONS' && optionId !== 'none') {
      // Multi-select for conditions
      setSelectedConditions(prev =>
        prev.includes(optionId)
          ? prev.filter(c => c !== optionId)
          : [...prev, optionId]
      );
      return;
    }
    if (conversationState === 'ASK_CONDITIONS' && optionId === 'none') {
      setSelectedConditions([]);
      handleSendMessage('none', labelMm, labelEn);
      return;
    }
    handleSendMessage(optionId, labelMm, labelEn);
  };

  const handleConfirmConditions = () => {
    const labels = selectedConditions.map(c => {
      if (c === 'dm') return { mm: 'ဆီးချိုရောဂါ', en: 'Diabetes' };
      if (c === 'hiv') return { mm: 'အိတ်ခ်ျအိုင်ဗွီ', en: 'HIV' };
      return { mm: c, en: c };
    });
    const displayMm = labels.length > 0 ? labels.map(l => l.mm).join(', ') : 'မရှိပါ';
    const displayEn = labels.length > 0 ? labels.map(l => l.en).join(', ') : 'None';
    handleSendMessage(selectedConditions.join(',') || 'none', displayMm, displayEn);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    handleSendMessage(inputText);
    setInputText('');
  };

  const isTextInputState = ['ASK_AGE', 'ASK_NAME', 'ASSISTED_ASK_PHONE', 'SELF_ASK_TOWNSHIP', 'SELF_ASK_CONTACT', 'OTHER_QUESTIONS'].includes(conversationState);
  const lastMessage = messages[messages.length - 1];
  const hasActiveOptions = lastMessage?.sender === 'bot' && lastMessage?.options && lastMessage.options.length > 0;

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: theme.fontFamily }}>
      {/* Chat Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 shadow-md z-10"
        style={{ backgroundColor: theme.headerBg, color: theme.headerText }}
      >
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
          {theme.avatarIcon}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">TB Self-Screening Bot</div>
          <div className="text-xs opacity-75">တီဘီ ကိုယ်တိုင်စစ်ဆေးခြင်း</div>
        </div>
        <span className="text-lg">{theme.headerIcon}</span>
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
        style={{ backgroundColor: theme.chatBg }}
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[80%]">
              {msg.sender === 'bot' && (
                <div className="flex items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-sm flex-shrink-0 mb-1">
                    🏥
                  </div>
                  <div
                    className="px-4 py-2.5 whitespace-pre-wrap text-sm leading-relaxed shadow-sm"
                    style={{
                      backgroundColor: theme.botBubbleBg,
                      color: theme.botBubbleText,
                      borderTopLeftRadius: '4px',
                      borderTopRightRadius: theme.borderRadius,
                      borderBottomLeftRadius: theme.borderRadius,
                      borderBottomRightRadius: theme.borderRadius,
                    }}
                  >
                    {msg.textMm}
                  </div>
                </div>
              )}
              {msg.sender === 'user' && (
                <div
                  className="px-4 py-2.5 whitespace-pre-wrap text-sm leading-relaxed shadow-sm"
                  style={{
                    backgroundColor: theme.userBubbleBg,
                    color: theme.userBubbleText,
                    borderTopLeftRadius: theme.borderRadius,
                    borderTopRightRadius: '4px',
                    borderBottomLeftRadius: theme.borderRadius,
                    borderBottomRightRadius: theme.borderRadius,
                  }}
                >
                  {msg.textMm}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Quick Reply Buttons */}
        {hasActiveOptions && !isTyping && (
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            {lastMessage.options!.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleOptionClick(opt.id, opt.labelMm, opt.labelEn)}
                className={`px-4 py-2 text-sm font-medium transition-all hover:opacity-80 active:scale-95 ${
                  conversationState === 'ASK_CONDITIONS' && selectedConditions.includes(opt.id)
                    ? 'ring-2 ring-offset-1'
                    : ''
                }`}
                style={{
                  backgroundColor: conversationState === 'ASK_CONDITIONS' && selectedConditions.includes(opt.id)
                    ? theme.buttonBorder
                    : theme.buttonBg,
                  color: conversationState === 'ASK_CONDITIONS' && selectedConditions.includes(opt.id)
                    ? theme.buttonBg
                    : theme.buttonText,
                  border: `1.5px solid ${theme.buttonBorder}`,
                  borderRadius: '20px',
                }}
              >
                {opt.labelMm}
              </button>
            ))}
            {conversationState === 'ASK_CONDITIONS' && selectedConditions.length > 0 && (
              <button
                onClick={handleConfirmConditions}
                className="px-4 py-2 text-sm font-bold transition-all hover:opacity-80 active:scale-95"
                style={{
                  backgroundColor: theme.buttonBorder,
                  color: '#ffffff',
                  borderRadius: '20px',
                  border: 'none',
                }}
              >
                {BOT_MESSAGES.confirm.mm}
              </button>
            )}
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-end gap-2">
              <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-sm flex-shrink-0 mb-1">
                🏥
              </div>
              <div
                className="px-4 py-3 shadow-sm"
                style={{
                  backgroundColor: theme.botBubbleBg,
                  borderTopLeftRadius: '4px',
                  borderTopRightRadius: theme.borderRadius,
                  borderBottomLeftRadius: theme.borderRadius,
                  borderBottomRightRadius: theme.borderRadius,
                }}
              >
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {(isTextInputState || conversationState === 'GOODBYE') && (
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-3 py-2 border-t"
          style={{ backgroundColor: theme.inputBg }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={conversationState === 'ASK_AGE' ? 'အသက် ရိုက်ထည့်ပါ...' : 'စာရိုက်ပါ...'}
            className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none border"
            style={{ backgroundColor: '#ffffff' }}
            disabled={conversationState === 'GOODBYE'}
            autoFocus
          />
          <button
            type="submit"
            className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ backgroundColor: theme.sendButtonColor, color: '#ffffff' }}
            disabled={!inputText.trim() || conversationState === 'GOODBYE'}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
      )}
    </div>
  );
}
