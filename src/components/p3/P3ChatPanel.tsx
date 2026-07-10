'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PlatformTheme } from '@/data/platformThemes';
import { BOT_VERSION, generateId } from '@/lib/chatEngine';
import { DEFAULT_MODEL_ID } from '@/lib/p3/models';
import FindProviderFlow from './FindProviderFlow';

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

// v1.9.1 — what the retrieval layer returned on the last turn. The dev
// panel widget renders this so testers can see what the LLM was
// grounded on without opening the Network tab.
export interface P3RetrievedChunkInfo {
  tag: string;                 // 'S1', 'S2', ...
  sourceTitle: string;
  sourceUrl: string | null;
  similarity: number;
  preview: string;
}

interface P3ChatPanelProps {
  theme: PlatformTheme;
  modelId: string;
  platformView: string;
  systemPromptOverride?: string | null;
  onUsageChange: (usage: P3UsageSnapshot) => void;
  onMessagesChange?: (messages: P3Msg[]) => void;
  onRetrievedChange?: (chunks: P3RetrievedChunkInfo[]) => void;
  onResetSignal?: number;     // bump to reset the conversation
}

export default function P3ChatPanel({ theme, modelId, platformView, systemPromptOverride, onUsageChange, onMessagesChange, onRetrievedChange, onResetSignal }: P3ChatPanelProps) {
  const [p3ConversationId, setP3ConversationId] = useState(() => `P3-${generateId()}`);
  const [messages, setMessages] = useState<P3Msg[]>([]);
  const [inputText, setInputText] = useState('');
  // P3 escalation referral flow has 2 steps now (v0.9.4):
  //   1) pick mode (Assisted vs Self)
  //   2) collect contact info — fields vary by mode
  type ReferralFlow =
    | { step: 'choose-mode'; careReferralId: string; level: EscalationLevel }
    | { step: 'collect-info'; careReferralId: string; mode: 'assisted' | 'self'; level: EscalationLevel };
  const [pendingEscalationPrompt, setPendingEscalationPrompt] = useState<ReferralFlow | null>(null);
  const [findProviderForReferralId, setFindProviderForReferralId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cache the transcript URL once Drive returns it on the first save; we
  // re-send it with subsequent telemetry upserts so the row keeps it.
  const transcriptUrlRef = useRef<string>('');

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
    transcriptUrlRef.current = '';
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

      // v1.9.1 — bubble the RAG retrieval up so the dev panel can
      // render what the LLM was grounded on this turn.
      if (onRetrievedChange) {
        const retrieved: P3RetrievedChunkInfo[] = Array.isArray(data.retrieved) ? data.retrieved : [];
        onRetrievedChange(retrieved);
      }

      // Snapshot the full message list including the brand-new reply so the
      // transcript save below doesn't race the state setter.
      const fullMessages = [...messages, userMsg, replyMsg];

      // Update running totals + write transcript + upsert telemetry
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

        // Write the Markdown transcript to Drive — then upsert the
        // telemetry row including the resulting webViewLink. Fire and
        // forget; failures get logged but don't block the chat.
        (async () => {
          let transcriptUrl = transcriptUrlRef.current;
          try {
            const tres = await fetch('/api/transcript/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                meta: {
                  conversationId: p3ConversationId,
                  mode: 'P3',
                  startedAt: fullMessages[0]?.ts ? new Date(fullMessages[0].ts).toISOString() : new Date().toISOString(),
                  lastMessageAt: new Date().toISOString(),
                  platformView,
                  botVersion: BOT_VERSION,
                  model: modelId,
                  totalPromptTokens: next.totalPromptTokens,
                  totalCompletionTokens: next.totalCompletionTokens,
                  estCostUsd: next.estCostUsd,
                  escalationsCount: next.escalationsCount,
                  careReferralIds: next.careReferralIds,
                },
                messages: fullMessages.map(m => ({
                  role: m.role === 'user' ? 'user' : 'bot',
                  textMm: m.textMm,
                  textEn: m.textEn,
                  ts: m.ts,
                  escalation: m.escalation,
                  careReferralId: m.careReferralId,
                })),
              }),
            });
            const tdata = await tres.json();
            if (tdata?.success && tdata.webViewLink) {
              transcriptUrl = tdata.webViewLink;
              transcriptUrlRef.current = tdata.webViewLink;
            } else if (!tdata?.success) {
              console.error('Transcript save returned error', tdata);
            }
          } catch (te) {
            console.error('Transcript save failed', te);
          }

          fetch('/api/p3/conversation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              p3ConversationId,
              startedAt: fullMessages[0]?.ts ? new Date(fullMessages[0].ts).toISOString() : new Date().toISOString(),
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
              transcriptUrl,
            }),
          }).catch(e => console.error('P3 telemetry upsert failed', e));
        })();

        return next;
      });

      // If escalation triggered AND a careReferralId was minted, start the
      // referral flow with the assisted/self choice step.
      if (replyMsg.careReferralId && (replyMsg.escalation === 'immediate' || replyMsg.escalation === 'telehealth')) {
        if (!patientTbCaseId) {
          setPendingEscalationPrompt({
            step: 'choose-mode',
            careReferralId: replyMsg.careReferralId,
            level: replyMsg.escalation,
          });
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

  // Step 1: user picks Assisted vs Self care referral.
  const handleReferralModeChoice = (mode: 'assisted' | 'self') => {
    if (!pendingEscalationPrompt || pendingEscalationPrompt.step !== 'choose-mode') return;
    const labelMm = mode === 'assisted' ? 'လမ်းညွှန်ပေးမှု ရွေးချယ်ပါသည်' : 'ကိုယ်တိုင် သွားရောက်မည်';
    const labelEn = mode === 'assisted' ? 'Selected Assisted referral' : 'Selected Self referral';
    setMessages(prev => [...prev, {
      id: generateId(),
      role: 'user',
      textMm: labelMm,
      textEn: labelEn,
      ts: Date.now(),
    }]);
    setPendingEscalationPrompt({
      step: 'collect-info',
      careReferralId: pendingEscalationPrompt.careReferralId,
      level: pendingEscalationPrompt.level,
      mode,
    });
  };

  // Step 2: user submits contact info (and optionally TB Case ID / current
  // provider ID for self mode). PATCHes the Care Referral Log row that was
  // minted by /api/p3/chat, then appends a clear acknowledgment whose
  // wording depends on whether the user provided contact info (so the bot
  // doesn't falsely promise a callback when no contact was actually shared).
  const handleEscalationSubmit = (name: string, caseId: string, contact: string, currentProviderId: string) => {
    if (!pendingEscalationPrompt || pendingEscalationPrompt.step !== 'collect-info') return;
    const txtName = name.trim();
    const txtCase = caseId.trim();
    const txtContact = contact.trim();
    const txtProvider = currentProviderId.trim();
    const { careReferralId, mode } = pendingEscalationPrompt;
    setPendingEscalationPrompt(null);

    // Echo the user's submission as a user turn (Mm + En)
    const parts: { mm: string; en: string }[] = [];
    if (txtName) parts.push({ mm: `နာမည်: ${txtName}`, en: `Name: ${txtName}` });
    if (txtCase) parts.push({ mm: `တီဘီ Case ID: ${txtCase}`, en: `TB Case ID: ${txtCase}` });
    if (txtContact) parts.push({ mm: `ဆက်သွယ်ရန် အချက်အလက်: ${txtContact}`, en: `Contact: ${txtContact}` });
    if (txtProvider) parts.push({ mm: `လက်ရှိ TB Provider ID: ${txtProvider}`, en: `Current TB Provider ID: ${txtProvider}` });
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
    // Always note the mode in the notes field for the dashboard reviewers.
    fetch('/api/care-referral-log', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        careReferralId,
        ...(txtName ? { clientName: txtName } : {}),
        ...(txtCase ? { patientTbCaseId: txtCase } : {}),
        ...(txtContact ? { patientContact: txtContact } : {}),
        notes: `referralMode: ${mode}${txtProvider ? ` · currentProviderId: ${txtProvider}` : ''}`,
      }),
    }).catch(e => console.error('Care referral PATCH failed', e));

    // Branch the acknowledgment by referral mode + whether contact was given.
    if (mode === 'assisted') {
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
        // Assisted but no contact — they CAN'T call you. Direct user out.
        setMessages(prev => [...prev, {
          id: generateId(),
          role: 'assistant',
          textMm: 'ကောင်းပါပြီ။ ဆက်သွယ်ရန် အချက်အလက် မပါသဖြင့် "နေ" Tele-Health အဖွဲ့မှ သင့်ထံ တိုက်ရိုက်ဆက်သွယ်နိုင်မည် မဟုတ်ပါ။\n\nကျေးဇူးပြု၍ အောက်ပါ နည်းလမ်းတစ်ခုခုဖြင့် "နေ" Tele-Health အဖွဲ့ကို ကိုယ်တိုင် ဆက်သွယ်ပါ —\nဖုန်း: 09-XXXXXXX\nViber: 09-XXXXXXX\nTelegram: @SCH-TB-XXXX\nFacebook: m.me/sch-tb-XXXX',
          textEn: 'Understood. Without your contact information, the Sun Tele-Health team will NOT be able to reach you directly.\n\nPlease contact them yourself via one of these channels —\nPhone: 09-XXXXXXX\nViber: 09-XXXXXXX\nTelegram: @SCH-TB-XXXX\nFacebook: m.me/sch-tb-XXXX',
          ts: Date.now(),
        }]);
      }
    } else {
      // Self mode — patient is going themselves. Acknowledgment is about
      // pointing them at the right place, not promising contact.
      const haveAny = txtCase || txtContact || txtProvider;
      const stored = haveAny
        ? '\n\nသင်ပေးထားသော အချက်အလက်များကို မှတ်တမ်းတင်ပြီးပါပြီ — Tele-Health အဖွဲ့သည် လိုအပ်ပါက လေ့လာနိုင်ပါမည်။'
        : '';
      const storedEn = haveAny
        ? '\n\nThe details you shared have been recorded — the Tele-Health team can review them if needed.'
        : '';
      const findNewMm = '\n\nသင့်လက်ရှိ ဆေးကုသနေသော Provider ထံ တိုက်ရိုက် သွားပါ။ မသိ/Provider အသစ်ရှာလိုပါက "နေ" Tele-Health အဖွဲ့ကို ဆက်သွယ်ပြီး အကူအညီတောင်းပါ။\n\nဖုန်း: 09-XXXXXXX\nViber: 09-XXXXXXX\nTelegram: @SCH-TB-XXXX\nFacebook: m.me/sch-tb-XXXX';
      const findNewEn = '\n\nPlease go directly to your current TB Care Provider. If you don\'t know where to go or want to find a new provider, contact the Sun Tele-Health team for help.\n\nPhone: 09-XXXXXXX\nViber: 09-XXXXXXX\nTelegram: @SCH-TB-XXXX\nFacebook: m.me/sch-tb-XXXX';
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        textMm: `သင်သည် ကိုယ်တိုင်သွားရောက်မည်ဖြစ်သည်ဟု ဆိုပါသည်။${stored}${findNewMm}`,
        textEn: `You have chosen Self referral.${storedEn}${findNewEn}`,
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
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden">
          <img src="/sch-logo.png" alt="Sun Community Health" className="w-full h-full object-contain" />
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

        {/* Step 1: assisted/self choice (v0.9.4) */}
        {pendingEscalationPrompt?.step === 'choose-mode' && (
          <ReferralModeChoicePrompt
            theme={theme}
            careReferralId={pendingEscalationPrompt.careReferralId}
            onChoose={handleReferralModeChoice}
          />
        )}

        {/* Step 2: collect contact info — fields vary by mode */}
        {pendingEscalationPrompt?.step === 'collect-info' && (
          <EscalationContactPrompt
            theme={theme}
            careReferralId={pendingEscalationPrompt.careReferralId}
            mode={pendingEscalationPrompt.mode}
            onSubmit={handleEscalationSubmit}
            onFindNewProvider={() => {
              setFindProviderForReferralId(pendingEscalationPrompt.careReferralId);
              setPendingEscalationPrompt(null);
            }}
          />
        )}

        {/* Find-provider cascade — opens when Self-mode user taps "Find new provider" */}
        {findProviderForReferralId && (
          <FindProviderFlow
            theme={theme}
            onCancel={() => setFindProviderForReferralId(null)}
            onComplete={(res) => {
              const careReferralId = findProviderForReferralId;
              setFindProviderForReferralId(null);
              // Persist the chosen location + first matching provider on the row.
              const providersSummary = res.providers.length === 0
                ? 'No providers in directory for this township'
                : res.providers.slice(0, 3).map(p => `${p.facility_name} (${p.address})`).join(' · ');
              fetch('/api/care-referral-log', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  careReferralId,
                  careProviderTownship: `${res.stateRegionEn} › ${res.districtEn} › ${res.townshipEn}`,
                  notes: `referralMode: self · find-new-provider: ${providersSummary}`,
                }),
              }).catch(e => console.error('Care referral PATCH failed', e));

              // Show the result in chat
              if (res.providers.length === 0) {
                setMessages(prev => [...prev, {
                  id: generateId(),
                  role: 'assistant',
                  textMm: `${res.stateRegionEn} › ${res.districtEn} › ${res.townshipEn} တွင် Sun GP ဆေးခန်း မရှိပါ။\n\nကျေးဇူးပြု၍ နီးစပ်ရာ မြို့နယ်ဆေးရုံ သို့ တီဘီဌာနသို့ သွားရောက်ပါ။ "နေ" Tele-Health အဖွဲ့သည် အသေးစိတ် လမ်းညွှန်ပေးနိုင်ပါသည် —\nဖုန်း: 09-XXXXXXX\nViber: 09-XXXXXXX\nTelegram: @SCH-TB-XXXX\nFacebook: m.me/sch-tb-XXXX`,
                  textEn: `No Sun GP clinic found in ${res.stateRegionEn} › ${res.districtEn} › ${res.townshipEn}.\n\nPlease go to your nearest township hospital or TB department. The Sun Tele-Health team can help —\nPhone: 09-XXXXXXX\nViber: 09-XXXXXXX\nTelegram: @SCH-TB-XXXX\nFacebook: m.me/sch-tb-XXXX`,
                  ts: Date.now(),
                }]);
                return;
              }
              const listMm = res.providers.slice(0, 5).map((p, i) =>
                `${i + 1}. ${p.facility_name_mm || p.facility_name}\n   📍 ${p.address}\n   📞 ${p.phone}\n   🏥 ${p.services}\n   🕐 ${p.operating_hours}`
              ).join('\n\n');
              const listEn = res.providers.slice(0, 5).map((p, i) =>
                `${i + 1}. ${p.facility_name}\n   📍 ${p.address}\n   📞 ${p.phone}\n   🏥 ${p.services}\n   🕐 ${p.operating_hours}`
              ).join('\n\n');
              setMessages(prev => [...prev, {
                id: generateId(),
                role: 'assistant',
                textMm: `${res.stateRegionEn} › ${res.districtEn} › ${res.townshipEn} အနီးရှိ TB Care Provider များ —\n\n${listMm}\n\nကျေးဇူးပြု၍ မိမိ နီးစပ်သော ဆေးခန်းတစ်ခုခုသို့ သွားရောက်ပါ။`,
                textEn: `TB Care Providers near ${res.stateRegionEn} › ${res.districtEn} › ${res.townshipEn} —\n\n${listEn}\n\nPlease go to the clinic nearest to you.`,
                ts: Date.now(),
              }]);
            }}
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

function ReferralModeChoicePrompt({
  theme, careReferralId, onChoose,
}: {
  theme: PlatformTheme;
  careReferralId: string;
  onChoose: (mode: 'assisted' | 'self') => void;
}) {
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
            <span>လမ်းညွှန် အကူအညီ ရယူနိုင်ပါသည် — အောက်ပါ နှစ်ခုထဲက တစ်ခုကို ရွေးချယ်ပါ —</span>
            <br />
            <span className="text-[11px] opacity-70">A referral can be set up two ways — please choose:</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => onChoose('assisted')}
              className="text-left px-3 py-2 bg-white border border-blue-300 hover:border-blue-500 rounded text-xs"
              title="The SCH Tele-Health team will call/message you. You'll be asked for contact info next."
            >
              <div className="font-semibold text-blue-900">လမ်းညွှန် အကူအညီ ရယူမည် · Assisted Referral</div>
              <div className="text-[11px] text-blue-800 opacity-80">"နေ" Tele-Health အဖွဲ့မှ သင့်ထံ ဖုန်း/Viber မှ ဆက်သွယ်ပါမည်</div>
              <div className="text-[10px] text-blue-700 opacity-60">SCH Tele-Health will reach out to you — needs your contact info.</div>
            </button>
            <button
              type="button"
              onClick={() => onChoose('self')}
              className="text-left px-3 py-2 bg-white border border-blue-300 hover:border-blue-500 rounded text-xs"
              title="You'll be told where to go and reach out yourself."
            >
              <div className="font-semibold text-blue-900">ကိုယ်တိုင် သွားရောက်မည် · Self Referral</div>
              <div className="text-[11px] text-blue-800 opacity-80">ကိုယ်တိုင် ဆေးခန်း/Tele-Health သို့ သွားရောက်/ဆက်သွယ်ပါမည်</div>
              <div className="text-[10px] text-blue-700 opacity-60">You go yourself — contact + TB Case ID + Provider ID optional.</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EscalationContactPrompt({
  theme, careReferralId, mode, onSubmit, onFindNewProvider,
}: {
  theme: PlatformTheme;
  careReferralId: string;
  mode: 'assisted' | 'self';
  // v1.7.5 — added `name` so Tele-Health knows who they're calling.
  onSubmit: (name: string, caseId: string, contact: string, currentProviderId: string) => void;
  onFindNewProvider?: () => void;
}) {
  const [name, setName] = useState('');
  const [caseId, setCaseId] = useState('');
  const [contact, setContact] = useState('');
  const [providerId, setProviderId] = useState('');

  // Mode-dependent copy
  const headerMm = mode === 'assisted'
    ? 'လမ်းညွှန် အကူအညီ ရယူရန် အောက်ပါ အချက်အလက်များ ပေးပါ။'
    : 'ကိုယ်တိုင် သွားရောက်ရန် မှတ်တမ်းတင်ရန် အောက်ပါ အချက်အလက်များ ပေးနိုင်ပါသည် (မဖြစ်မနေ မဟုတ်ပါ)။';
  const headerEn = mode === 'assisted'
    ? 'For SCH Tele-Health to reach you, please share —'
    : 'For our records on your self-referral, you can optionally share —';
  const submitDisabled = mode === 'assisted'
    ? !contact.trim()   // assisted MUST have contact info
    : (!caseId.trim() && !contact.trim() && !providerId.trim());

  return (
    <div className="flex justify-start" style={{ marginBottom: theme.messageGap }}>
      <div className="max-w-[90%] w-full">
        <div
          className="shadow-sm border-l-4 border-blue-400 bg-blue-50 rounded p-3 space-y-2"
          style={{ fontSize: theme.fontSize, color: '#1e3a8a' }}
        >
          <div className="whitespace-pre-wrap">
            🩺 careReferralId: <code className="font-mono text-[11px]">{careReferralId}</code>
            <span className="ml-2 text-[10px] uppercase tracking-wide bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded">
              {mode === 'assisted' ? 'Assisted' : 'Self'}
            </span>
            <br />
            <span>{headerMm}</span>
            <br />
            <span className="text-[11px] opacity-70">{headerEn}</span>
          </div>

          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wide mb-0.5 opacity-80">
              Name {mode === 'assisted' ? '(recommended)' : '(optional)'}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none"
            />
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
              Phone / Viber / Contact {mode === 'assisted' ? '(required)' : '(optional)'}
            </label>
            <input
              type="text"
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder="e.g. 09xxxxxxxx"
              className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none"
            />
          </div>

          {mode === 'self' && (
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wide mb-0.5 opacity-80">
                Current TB Care Provider ID (optional)
              </label>
              <input
                type="text"
                value={providerId}
                onChange={e => setProviderId(e.target.value)}
                placeholder="e.g. SUN-YGN-0042"
                className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none"
              />
              <div className="mt-1 text-[10px] opacity-70">
                Don&apos;t know your provider or want a new one?
              </div>
              {onFindNewProvider && (
                <button
                  type="button"
                  onClick={onFindNewProvider}
                  className="mt-1 text-[11px] underline text-blue-700 hover:text-blue-900"
                  title="Open the location cascade to find a TB care provider near you."
                >
                  📍 Find a new TB care provider near me
                </button>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onSubmit(name, caseId, contact, providerId)}
              disabled={submitDisabled}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-40"
              title={mode === 'assisted' ? 'Contact info is required for SCH Tele-Health to reach you.' : undefined}
            >
              Submit
            </button>
            <button
              type="button"
              onClick={() => onSubmit('', '', '', '')}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
              title="Skip all fields. SCH Tele-Health will not be able to reach you directly."
            >
              Skip all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { P3UsageSnapshot };
export { DEFAULT_MODEL_ID };
