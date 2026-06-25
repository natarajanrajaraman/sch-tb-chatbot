'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PlatformTheme } from '@/data/platformThemes';
import { BOT_VERSION, generateId } from '@/lib/chatEngine';
import { DEFAULT_MODEL_ID } from '@/lib/p3/models';

export type EscalationLevel = 'none' | 'nonurgent' | 'telehealth' | 'immediate';

export interface P3Msg {
  id: string;
  role: 'user' | 'assistant';
  textMm: string;
  textEn: string;
  ts: number;
  escalation?: EscalationLevel;
  careReferralId?: string;
}

interface P3UsageSnapshot {
  modelId: string;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  estCostUsd: number;
  lastEscalationLevel: EscalationLevel;
  escalationsCount: number;
  careReferralIds: string[];
}

interface P3ChatPanelProps {
  theme: PlatformTheme;
  modelId: string;
  platformView: string;
  systemPromptOverride?: string | null;
  onUsageChange: (usage: P3UsageSnapshot) => void;
  onMessagesChange?: (messages: P3Msg[]) => void;
  onResetSignal?: number;     // bump to reset the conversation
}

export default function P3ChatPanel({ theme, modelId, platformView, systemPromptOverride, onUsageChange, onMessagesChange, onResetSignal }: P3ChatPanelProps) {
  const [p3ConversationId, setP3ConversationId] = useState(() => `P3-${generateId()}`);
  const [messages, setMessages] = useState<P3Msg[]>([]);
  const [inputText, setInputText] = useState('');
  const [pendingEscalationPrompt, setPendingEscalationPrompt] = useState<{ careReferralId: string } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [totals, setTotals] = useState<P3UsageSnapshot>({
    modelId,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    estCostUsd: 0,
    lastEscalationLevel: 'none',
    escalationsCount: 0,
    careReferralIds: [],
  });

  // Reset everything when the parent bumps the reset signal
  useEffect(() => {
    if (onResetSignal == null) return;
    setMessages([]);
    setInputText('');
    setPendingEscalationPrompt(null);
    setError(null);
    setP3ConversationId(`P3-${generateId()}`);
    setTotals({
      modelId,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      estCostUsd: 0,
      lastEscalationLevel: 'none',
      escalationsCount: 0,
      careReferralIds: [],
    });
  }, [onResetSignal, modelId]);

  // Bubble usage + messages up to the host page so TranslationPanel
  // can render English alongside the Burmese chat.
  useEffect(() => {
    onUsageChange(totals);
  }, [totals, onUsageChange]);

  useEffect(() => {
    if (onMessagesChange) onMessagesChange(messages);
  }, [messages, onMessagesChange]);

  // Scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Show an initial Burmese greeting on first render
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: generateId(),
        role: 'assistant',
        textMm: 'မင်္ဂလာပါ! "နေ" ဆေးခန်း တီဘီ Chatbot မှ ကြိုဆိုပါသည်။ တီဘီရောဂါ ကုသမှု၊ ဆေးသောက်ပုံ၊ ဘေးထွက်ဆိုးကျိုးများ နှင့် ပြုစုစောင့်ရှောက်ခြင်းအကြောင်း မေးခွန်းများ မေးနိုင်ပါသည်။ မည်သို့ ကူညီပေးရမည်နည်း?',
        textEn: 'Hello! Welcome to the Sun Clinic TB Chatbot. You can ask questions about TB treatment, taking medicine, side effects, and supportive care. How can I help you?',
        ts: Date.now(),
        escalation: 'none',
      }]);
    }
  }, [messages.length]);

  const sendChatTurn = useCallback(async (userText: string, patientTbCaseId?: string) => {
    setError(null);
    setIsTyping(true);

    // User-typed text is stored as-is in both surfaces — we don't
    // translate the user's side. If they type Burmese, both show
    // Burmese; if English, both show English.
    const userMsg: P3Msg = { id: generateId(), role: 'user', textMm: userText, textEn: userText, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    // Build history payload (everything currently in state except the message we just added)
    // For the LLM context, we send the Burmese surface (which == user-typed for user turns).
    const historyPayload = messages.map(m => ({ role: m.role, content: m.textMm }));

    try {
      const res = await fetch('/api/p3/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p3ConversationId,
          modelId,
          history: historyPayload,
          userMessage: userText,
          patientTbCaseId,
          systemPromptOverride: systemPromptOverride || undefined,
        }),
      });
      const data = await res.json();
      if (!data?.success) {
        throw new Error(data?.error || 'Unknown error');
      }
      const replyMsg: P3Msg = {
        id: generateId(),
        role: 'assistant',
        textMm: data.replyMm || data.reply || '',
        textEn: data.replyEn || data.replyMm || data.reply || '',
        ts: Date.now(),
        escalation: data.escalation?.level || 'none',
        careReferralId: data.escalation?.careReferralId,
      };
      setMessages(prev => [...prev, replyMsg]);

      // Update running totals
      setTotals(prev => {
        const next: P3UsageSnapshot = {
          modelId,
          totalPromptTokens: prev.totalPromptTokens + (data.tokens?.prompt || 0),
          totalCompletionTokens: prev.totalCompletionTokens + (data.tokens?.completion || 0),
          estCostUsd: prev.estCostUsd + (data.estCostUsd || 0),
          lastEscalationLevel: replyMsg.escalation || 'none',
          escalationsCount: prev.escalationsCount + (replyMsg.escalation === 'immediate' || replyMsg.escalation === 'telehealth' ? 1 : 0),
          careReferralIds: data.escalation?.careReferralId
            ? [...prev.careReferralIds, data.escalation.careReferralId]
            : prev.careReferralIds,
        };
        // Fire-and-forget telemetry upsert
        fetch('/api/p3/conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            p3ConversationId,
            startedAt: messages[0]?.ts ? new Date(messages[0].ts).toISOString() : new Date().toISOString(),
            lastMessageAt: new Date().toISOString(),
            model: modelId,
            userMessageCount: historyPayload.filter(h => h.role === 'user').length + 1,
            totalPromptTokens: next.totalPromptTokens,
            totalCompletionTokens: next.totalCompletionTokens,
            estCostUsd: next.estCostUsd,
            lastEscalationLevel: next.lastEscalationLevel,
            escalationsCount: next.escalationsCount,
            careReferralIds: next.careReferralIds.join(', '),
            platformView,
            botVersion: BOT_VERSION,
          }),
        }).catch(e => console.error('P3 telemetry upsert failed', e));
        return next;
      });

      // If escalation triggered AND a careReferralId was minted, prompt for TB case ID (skippable)
      if (replyMsg.careReferralId && (replyMsg.escalation === 'immediate' || replyMsg.escalation === 'telehealth')) {
        // Only prompt once per escalation
        if (!patientTbCaseId) {
          setPendingEscalationPrompt({ careReferralId: replyMsg.careReferralId });
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Chat failed: ${msg.slice(0, 200)}`);
    } finally {
      setIsTyping(false);
    }
  }, [messages, p3ConversationId, modelId, platformView, systemPromptOverride]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = inputText.trim();
    if (!t || isTyping) return;
    setInputText('');
    sendChatTurn(t);
  };

  // Escalation prompt handler — collects optional TB Case ID + contact info.
  // PATCHes the Care Referral Log row that was minted by /api/p3/chat, then
  // appends a clear acknowledgment whose wording depends on whether the
  // user provided contact info (so the bot doesn't falsely promise a
  // callback when no contact was actually shared).
  const handleEscalationSubmit = (caseId: string, contact: string) => {
    if (!pendingEscalationPrompt) return;
    const txtCase = caseId.trim();
    const txtContact = contact.trim();
    const { careReferralId } = pendingEscalationPrompt;
    setPendingEscalationPrompt(null);

    // Echo the user's submission as a user turn (Mm + En)
    const parts: { mm: string; en: string }[] = [];
    if (txtCase) parts.push({ mm: `တီဘီ Case ID: ${txtCase}`, en: `TB Case ID: ${txtCase}` });
    if (txtContact) parts.push({ mm: `ဆက်သွယ်ရန် အချက်အလက်: ${txtContact}`, en: `Contact: ${txtContact}` });
    const userMm = parts.length > 0 ? parts.map(p => p.mm).join(' · ') : 'အချက်အလက် မပေးပါ (ကျော်ပါမည်)';
    const userEn = parts.length > 0 ? parts.map(p => p.en).join(' · ') : 'Skipped (no info provided)';
    setMessages(prev => [...prev, {
      id: generateId(),
      role: 'user',
      textMm: userMm,
      textEn: userEn,
      ts: Date.now(),
    }]);

    // Persist whatever the user shared onto the existing Care Referral Log row.
    if (txtCase || txtContact) {
      fetch('/api/care-referral-log', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          careReferralId,
          ...(txtCase ? { patientTbCaseId: txtCase } : {}),
          ...(txtContact ? { patientContact: txtContact } : {}),
        }),
      }).catch(e => console.error('Care referral PATCH failed', e));
    }

    // Branch the acknowledgment so we don't promise a callback when we
    // have no way to actually call back.
    if (txtContact) {
      const lead = txtCase
        ? `ကျေးဇူးတင်ပါသည်။ TB Case ID (${txtCase}) နှင့် ဆက်သွယ်ရန် အချက်အလက် (${txtContact})`
        : `ကျေးဇူးတင်ပါသည်။ သင်ပေးထားသော ဆက်သွယ်ရန် အချက်အလက် (${txtContact})`;
      const leadEn = txtCase
        ? `Thank you. Your TB Case ID (${txtCase}) and contact details (${txtContact})`
        : `Thank you. Your contact details (${txtContact})`;
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        textMm: `${lead} ကို "နေ" Tele-Health အဖွဲ့ထံ ပေးပို့ပြီးပါပြီ။ မကြာမီ ဆက်သွယ်ပါမည်။`,
        textEn: `${leadEn} have been shared with the Sun Tele-Health team. They will reach you shortly.`,
        ts: Date.now(),
      }]);
    } else {
      // No contact info provided — DO NOT promise a callback. Direct the
      // user to reach Tele-Health themselves via the follow-up channels.
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        textMm: 'ကောင်းပါပြီ။ ဆက်သွယ်ရန် အချက်အလက် မပါသဖြင့် "နေ" Tele-Health အဖွဲ့မှ သင့်ထံ တိုက်ရိုက်ဆက်သွယ်နိုင်မည် မဟုတ်ပါ။\n\nကျေးဇူးပြု၍ အောက်ပါ နည်းလမ်းတစ်ခုခုဖြင့် "နေ" Tele-Health အဖွဲ့ကို ကိုယ်တိုင် ဆက်သွယ်ပါ —\nဖုန်း: 09-XXXXXXX\nViber: 09-XXXXXXX\nTelegram: @SCH-TB-XXXX\nFacebook: m.me/sch-tb-XXXX',
        textEn: 'Understood. Without your contact information, the Sun Tele-Health team will NOT be able to reach you directly.\n\nPlease contact them yourself via one of these channels —\nPhone: 09-XXXXXXX\nViber: 09-XXXXXXX\nTelegram: @SCH-TB-XXXX\nFacebook: m.me/sch-tb-XXXX',
        ts: Date.now(),
      }]);
    }
  };

  const escalationStyle = (lvl?: EscalationLevel) => {
    if (lvl === 'immediate') return 'border-l-4 border-red-500 bg-red-50';
    if (lvl === 'telehealth') return 'border-l-4 border-orange-400 bg-orange-50';
    if (lvl === 'nonurgent') return 'border-l-4 border-amber-300 bg-amber-50';
    return '';
  };

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: theme.fontFamily, fontSize: theme.fontSize }}>
      {/* Chat Header */}
      <div
        className="flex items-center gap-3 shadow-md z-10 shrink-0"
        style={{ backgroundColor: theme.headerBg, color: theme.headerText, padding: theme.headerPadding }}
      >
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">
          {theme.avatarIcon}
        </div>
        <div className="flex-1">
          <div className="font-semibold" style={{ fontSize: theme.fontSize }}>SCH TB Chatbot — Patient Info</div>
          <div className="opacity-75" style={{ fontSize: '11px' }}>တီဘီလူနာအချက်အလက် Chatbot</div>
        </div>
        <span className="text-lg">🤖</span>
      </div>

      {error && (
        <div className="bg-red-600/90 text-white text-[11px] px-3 py-1.5 flex items-center justify-between gap-2 shrink-0">
          <span className="truncate">⚠ {error}</span>
          <button onClick={() => setError(null)} className="opacity-80 hover:opacity-100 text-base leading-none">×</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3" style={{ backgroundColor: theme.chatBg, gap: theme.messageGap, display: 'flex', flexDirection: 'column' }}>
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`} style={{ marginBottom: theme.messageGap }}>
            <div className="max-w-[85%]">
              <div
                className={`whitespace-pre-wrap leading-relaxed shadow-sm break-words rounded ${msg.role === 'assistant' ? escalationStyle(msg.escalation) : ''}`}
                style={{
                  backgroundColor: msg.role === 'user' ? theme.userBubbleBg : theme.botBubbleBg,
                  color: msg.role === 'user' ? theme.userBubbleText : theme.botBubbleText,
                  padding: theme.messagePadding,
                  fontSize: theme.fontSize,
                  borderRadius: theme.borderRadius,
                  wordBreak: 'break-word',
                }}
              >
                {msg.textMm}
                {msg.careReferralId && (
                  <div className="mt-2 text-[10px] opacity-80">
                    🩺 careReferralId: <code className="font-mono">{msg.careReferralId}</code>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Escalation contact prompt — TB Case ID + Phone/Contact */}
        {pendingEscalationPrompt && (
          <EscalationContactPrompt
            theme={theme}
            careReferralId={pendingEscalationPrompt.careReferralId}
            onSubmit={handleEscalationSubmit}
          />
        )}

        {isTyping && (
          <div className="flex justify-start">
            <div className="px-4 py-3 shadow-sm" style={{ backgroundColor: theme.botBubbleBg, borderRadius: theme.borderRadius }}>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2 border-t shrink-0" style={{ backgroundColor: theme.inputBg }}>
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="စာပို့ပါ... (Type a message)"
          className="flex-1 px-4 py-2.5 outline-none border"
          style={{ backgroundColor: '#ffffff', borderRadius: theme.inputRadius, fontSize: theme.fontSize }}
          disabled={isTyping || !!pendingEscalationPrompt}
        />
        <button
          type="submit"
          className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ backgroundColor: theme.sendButtonColor, color: '#ffffff' }}
          disabled={!inputText.trim() || isTyping || !!pendingEscalationPrompt}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  );
}

function EscalationContactPrompt({
  theme, careReferralId, onSubmit,
}: {
  theme: PlatformTheme;
  careReferralId: string;
  onSubmit: (caseId: string, contact: string) => void;
}) {
  const [caseId, setCaseId] = useState('');
  const [contact, setContact] = useState('');
  return (
    <div className="flex justify-start" style={{ marginBottom: theme.messageGap }}>
      <div className="max-w-[90%] w-full">
        <div
          className="shadow-sm border-l-4 border-blue-400 bg-blue-50 rounded p-3 space-y-2"
          style={{ fontSize: theme.fontSize, color: '#1e3a8a' }}
        >
          <div className="whitespace-pre-wrap">
            🩺 careReferralId: <code className="font-mono text-[11px]">{careReferralId}</code>
            <br />
            <span>ဆက်လက်လုပ်ဆောင်ရန် အောက်ပါ အချက်အလက်များ ပေးပါ — "နေ" Tele-Health အဖွဲ့မှ သင်ထံ ဆက်သွယ်နိုင်ပါမည်။ မပေးလိုပါက ကျော်နိုင်ပါသည်။</span>
            <br />
            <span className="text-[11px] opacity-70">To complete this referral, please share the details below so the Sun Tele-Health team can reach you. You can skip both — but then they will not be able to contact you directly.</span>
          </div>

          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wide mb-0.5 opacity-80">TB Case ID (optional)</label>
            <input
              type="text"
              value={caseId}
              onChange={e => setCaseId(e.target.value)}
              placeholder="e.g. TB-2026-0123"
              className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wide mb-0.5 opacity-80">
              Phone / Viber / Contact (recommended)
            </label>
            <input
              type="text"
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder="e.g. 09xxxxxxxx"
              className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onSubmit(caseId, contact)}
              disabled={!caseId.trim() && !contact.trim()}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-40"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={() => onSubmit('', '')}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
              title="Skip both fields"
            >
              Skip both
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { P3UsageSnapshot };
export { DEFAULT_MODEL_ID };
