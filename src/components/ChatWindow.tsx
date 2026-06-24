'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PlatformTheme } from '@/data/platformThemes';
import {
  Message,
  ConversationState,
  SessionData,
  processUserInput,
  generateReferralLetter,
  generateId,
  getQuestionLocationForState,
  getQuestionByLocation,
  buildScreeningQuestionMessage,
  buildExplanationMessage,
  buildBackAtFirstMessage,
  buildExitMessage,
  getActionConfigForState,
  getExplanationForState,
  rebuildCurrentMessage,
  goBack,
} from '@/lib/chatEngine';
import { BOT_MESSAGES } from '@/data/messages';
import { t } from '@/lib/textRegistry';

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
    const result = processUserInput(conversationState, inputValue, session);

    setSession(result.updatedSession);
    setConversationState(result.nextState);

    // Handle special states
    if (result.nextState === 'SYMPTOM_INTRO') {
      // Show intro then auto-advance to first symptom question
      addBotMessageWithDelay(result.botMessage);
      setTimeout(() => {
        const firstQ = processUserInput('SYMPTOM_INTRO', '', result.updatedSession);
        addBotMessageWithDelay(firstQ.botMessage);
        setConversationState(firstQ.nextState);
      }, 1500);
      return;
    }

    if (result.nextState === 'RISK_FACTOR_INTRO') {
      // Show intro then auto-advance to first risk factor question
      addBotMessageWithDelay(result.botMessage);
      setTimeout(() => {
        const firstRf = processUserInput('RISK_FACTOR_INTRO', '', result.updatedSession);
        addBotMessageWithDelay(firstRf.botMessage);
        setConversationState(firstRf.nextState);
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
          // Q12 — no Sun GP for this township; still issue the referral letter and
          // point to the nearest township hospital or TB department.
          const noMatch = t('msg.self_referral_no_match', BOT_MESSAGES.self_referral_no_match);
          const letter = generateReferralLetter(result.updatedSession, '', result.updatedSession.referralTownship || '');
          const header = t('msg.referral_letter_header', BOT_MESSAGES.referral_letter_header);
          resultText = {
            mm: noMatch.mm + '\n' + header.mm + '\n\n' + letter.mm,
            en: noMatch.en + '\n' + header.en + '\n\n' + letter.en,
          };
        } else {
          type Site = { site_id: string; facility_name: string; facility_name_mm?: string; address: string; phone: string; services: string; operating_hours: string };
          const siteListMm = (sites as Site[]).map((s, i) =>
            `${i + 1}. ${s.facility_name_mm || s.facility_name}\n   📍 ${s.address}\n   📞 ${s.phone}\n   🏥 ${s.services}\n   🕐 ${s.operating_hours}`
          ).join('\n\n');
          const siteListEn = (sites as Site[]).map((s, i) =>
            `${i + 1}. ${s.facility_name}\n   📍 ${s.address}\n   📞 ${s.phone}\n   🏥 ${s.services}\n   🕐 ${s.operating_hours}`
          ).join('\n\n');

          const letter = generateReferralLetter(result.updatedSession, sites[0].facility_name, result.updatedSession.referralTownship || '');
          const siteHeader = t('msg.self_referral_result_header', BOT_MESSAGES.self_referral_result_header);
          const letterHeader = t('msg.referral_letter_header', BOT_MESSAGES.referral_letter_header);

          resultText = {
            mm: siteHeader.mm + siteListMm + '\n' + letterHeader.mm + '\n\n' + letter.mm,
            en: siteHeader.en + siteListEn + '\n' + letterHeader.en + '\n\n' + letter.en,
          };

          result.updatedSession.referralSitesShown = (sites as Site[]).map(s => s.site_id);
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

    if (result.nextState === 'LANDING' && conversationState !== 'LANDING') {
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
  }, [conversationState, session, addBotMessageWithDelay, setMessages, setSession, setConversationState]);

  const handleScreeningAction = useCallback((actionId: string, labelMm: string, labelEn: string) => {
    const cfg = getActionConfigForState(conversationState);
    // Sanity: if the current state has no action config, ignore the tap
    if (!cfg.explain && !cfg.back && !cfg.exit) return;

    // Echo the user's tap as a user message
    const userMessage: Message = {
      id: generateId(),
      sender: 'user',
      textMm: labelMm,
      textEn: labelEn,
      timestamp: Date.now(),
    };
    setMessages((prev: Message[]) => [...prev, userMessage]);

    if (actionId === 'act_explain' && cfg.explain) {
      // Per-question explanation for symptom/RF states; state-level explanation otherwise
      const loc = getQuestionLocationForState(conversationState);
      if (loc) {
        const q = getQuestionByLocation(loc);
        if (q) {
          addBotMessageWithDelay(buildExplanationMessage(q));
          setTimeout(() => addBotMessageWithDelay(buildScreeningQuestionMessage(q)), 1400);
        }
        return;
      }
      const expl = getExplanationForState(conversationState);
      if (expl) {
        addBotMessageWithDelay(expl);
        const reShow = rebuildCurrentMessage(conversationState, session);
        if (reShow) setTimeout(() => addBotMessageWithDelay(reShow), 1400);
      }
      return;
    }

    if (actionId === 'act_back' && cfg.back) {
      const result = goBack(conversationState, session);
      if ('atFirst' in result && result.atFirst) {
        addBotMessageWithDelay(buildBackAtFirstMessage());
        const reShow = rebuildCurrentMessage(conversationState, session);
        if (reShow) setTimeout(() => addBotMessageWithDelay(reShow), 1200);
        return;
      }
      if (!('atFirst' in result && result.atFirst)) {
        // narrow type — we're in the non-atFirst branch here
        const r = result as { prevState: ConversationState; prevMessage: Message; updatedSession: SessionData };
        setSession(r.updatedSession);
        setConversationState(r.prevState);
        addBotMessageWithDelay(r.prevMessage);
      }
      return;
    }

    if (actionId === 'act_exit' && cfg.exit) {
      setSession((prev: SessionData) => ({
        ...prev,
        status: 'abandoned',
        completedAt: new Date().toISOString(),
      }));
      setConversationState('EXITED');
      addBotMessageWithDelay(buildExitMessage());
      return;
    }
  }, [conversationState, session, setMessages, setSession, setConversationState, addBotMessageWithDelay]);

  const handleOptionClick = (optionId: string, labelMm: string, labelEn: string) => {
    // Screening action buttons (What does this mean / Go back / Exit) — handle locally
    if (optionId === 'act_explain' || optionId === 'act_back' || optionId === 'act_exit') {
      handleScreeningAction(optionId, labelMm, labelEn);
      return;
    }
    handleSendMessage(optionId, labelMm, labelEn);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    handleSendMessage(inputText);
    setInputText('');
  };

  const isTextInputState = [
    'ASK_AGE', 'ASK_NAME',
    'ASSISTED_ASK_PHONE',
    'SELF_ASK_TOWNSHIP_FREEFORM', 'SELF_ASK_CONTACT',
    'OTHER_QUESTIONS',
  ].includes(conversationState);
  const lastMessage = messages[messages.length - 1];
  const hasActiveOptions = lastMessage?.sender === 'bot' && lastMessage?.options && lastMessage.options.length > 0;

  const showAvatar = theme.avatarSize !== '0';
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: theme.fontFamily, fontSize: theme.fontSize }}>
      {/* Chat Header */}
      <div
        className="flex items-center gap-3 shadow-md z-10"
        style={{ backgroundColor: theme.headerBg, color: theme.headerText, padding: theme.headerPadding }}
      >
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">
          {theme.avatarIcon}
        </div>
        <div className="flex-1">
          <div className="font-semibold" style={{ fontSize: theme.fontSize }}>TB Self-Screening Bot</div>
          <div className="opacity-75" style={{ fontSize: '11px' }}>တီဘီ ကိုယ်တိုင်စစ်ဆေးခြင်း</div>
        </div>
        <span className="text-lg">{theme.headerIcon}</span>
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3"
        style={{ backgroundColor: theme.chatBg, gap: theme.messageGap, display: 'flex', flexDirection: 'column' }}
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`} style={{ marginBottom: theme.messageGap }}>
            <div className="max-w-[80%]">
              {msg.sender === 'bot' && (
                <div className="flex items-end gap-2">
                  {showAvatar && (
                    <div
                      className="rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 mb-1"
                      style={{ width: theme.avatarSize, height: theme.avatarSize, fontSize: `calc(${theme.avatarSize} * 0.5)` }}
                    >
                      🏥
                    </div>
                  )}
                  <div>
                    <div
                      className="whitespace-pre-wrap leading-relaxed shadow-sm"
                      style={{
                        backgroundColor: theme.botBubbleBg,
                        color: theme.botBubbleText,
                        padding: theme.messagePadding,
                        fontSize: theme.fontSize,
                        borderTopLeftRadius: '4px',
                        borderTopRightRadius: theme.borderRadius,
                        borderBottomLeftRadius: theme.borderRadius,
                        borderBottomRightRadius: theme.borderRadius,
                      }}
                    >
                      {msg.textMm}
                    </div>
                    {theme.showTimestamp && (
                      <div className="text-gray-400 mt-0.5" style={{ fontSize: '10px' }}>{formatTime(msg.timestamp)}</div>
                    )}
                  </div>
                </div>
              )}
              {msg.sender === 'user' && (
                <div>
                  <div
                    className="whitespace-pre-wrap leading-relaxed shadow-sm"
                    style={{
                      backgroundColor: theme.userBubbleBg,
                      color: theme.userBubbleText,
                      padding: theme.messagePadding,
                      fontSize: theme.fontSize,
                      borderTopLeftRadius: theme.borderRadius,
                      borderTopRightRadius: '4px',
                      borderBottomLeftRadius: theme.borderRadius,
                      borderBottomRightRadius: theme.borderRadius,
                    }}
                  >
                    {msg.textMm}
                  </div>
                  {theme.showTimestamp && (
                    <div className="text-gray-400 mt-0.5 text-right" style={{ fontSize: '10px' }}>{formatTime(msg.timestamp)}</div>
                  )}
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
                className="font-medium transition-all hover:opacity-80 active:scale-95"
                style={{
                  backgroundColor: theme.buttonBg,
                  color: theme.buttonText,
                  border: `1.5px solid ${theme.buttonBorder}`,
                  borderRadius: theme.buttonRadius,
                  padding: theme.messagePadding,
                  fontSize: theme.fontSize,
                }}
              >
                {opt.labelMm}
              </button>
            ))}
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-end gap-2">
              {showAvatar && (
                <div
                  className="rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 mb-1"
                  style={{ width: theme.avatarSize, height: theme.avatarSize, fontSize: `calc(${theme.avatarSize} * 0.5)` }}
                >
                  🏥
                </div>
              )}
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
            className="flex-1 px-4 py-2.5 outline-none border"
            style={{ backgroundColor: '#ffffff', borderRadius: theme.inputRadius, fontSize: theme.fontSize }}
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
