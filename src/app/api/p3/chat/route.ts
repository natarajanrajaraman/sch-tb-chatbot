import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter, P3ChatMessage } from '@/lib/p3/openrouter';
import { findModel, DEFAULT_MODEL_ID, estimateCostUsd } from '@/lib/p3/models';
import { getSystemPrompt } from '@/lib/p3/loadDocs';
import { parseEscalationTag, ruleBasedPreCheck, maxLevel, EscalationLevel } from '@/lib/p3/escalation';
import { saveCareReferralLog, saveAlertLog } from '@/lib/googleSheets';
import { retrieveKbChunks, formatChunksForPrompt } from '@/lib/p3/rag';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ChatRequestBody {
  p3ConversationId: string;
  modelId?: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  userMessage: string;
  patientTbCaseId?: string;          // optional; if user provided one at the
                                     // escalation prompt
  patientContact?: string;           // optional; if user provided contact info
                                     // at the escalation prompt
  systemPromptOverride?: string;     // optional; debug-panel hot-edit
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChatRequestBody;
    const modelId = body.modelId && findModel(body.modelId) ? body.modelId : DEFAULT_MODEL_ID;
    // Hot-edit support: if the caller supplied a non-empty override
    // (from the debug-panel editor), use it instead of the canonical
    // docs/p3-system-prompt.md content.
    const sysPrompt = (body.systemPromptOverride && body.systemPromptOverride.trim())
      ? body.systemPromptOverride
      : getSystemPrompt();

    // Rule-based pre-check on the user's latest message
    const preCheck = ruleBasedPreCheck(body.userMessage);

    // v1.9.0 — RAG retrieval. Grounds the reply in KZ's 6-PDF KB.
    // Falls back to the inline system-prompt summary when Supabase is
    // unreachable or the table is empty — the bot never breaks
    // because RAG is unavailable.
    const recentUserTurns = body.history
      .filter(h => h.role === 'user')
      .slice(-2)
      .map(h => h.content);
    const kbChunks = await retrieveKbChunks(body.userMessage, {
      topK: 6,
      recentTurns: recentUserTurns,
    });
    const kbBlock = formatChunksForPrompt(kbChunks);

    const systemContent = kbBlock
      ? `${sysPrompt}\n\n${kbBlock}`
      : sysPrompt;

    // Build the OpenRouter call
    const messages: P3ChatMessage[] = [
      { role: 'system', content: systemContent },
      ...body.history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: body.userMessage },
    ];

    const result = await callOpenRouter(modelId, messages);

    // Strip the LLM's escalation tag + split into Burmese/English halves
    const { level: llmLevel, replyMm, replyEn } = parseEscalationTag(result.text);
    // If the LLM forgot the EN separator, fall back to the Burmese
    // reply for both surfaces so the panel still shows something.
    const finalReplyMm = replyMm || result.text.trim();
    const finalReplyEn = replyEn || replyMm || result.text.trim();

    // Final level = max(LLM, rule-based)
    const finalLevel: EscalationLevel = maxLevel(preCheck.level, llmLevel);

    // If escalation is immediate or telehealth, log a care referral row +
    // an alerts row (independent of whether the user follows through).
    let careReferralId: string | undefined;
    if (finalLevel === 'immediate' || finalLevel === 'telehealth') {
      careReferralId = `CR-${Date.now()}`;
      const reasonParts: string[] = [];
      if (preCheck.matches.length > 0) reasonParts.push(`rule: ${preCheck.matches.join('; ')}`);
      if (llmLevel !== 'none') reasonParts.push(`llm: ${llmLevel}`);
      reasonParts.push(`level: ${finalLevel}`);

      // Alerts Log row — written regardless of whether the user completes
      // the referral flow. This is the reviewer queue.
      try {
        await saveAlertLog({
          alertId: `AL-${Date.now()}`,
          conversationId: body.p3ConversationId,
          alertTimestamp: new Date().toISOString(),
          mode: 'P3',
          escalationLevel: finalLevel,
          triggerReason: reasonParts.join(' | '),
          userMessageSnippet: body.userMessage.slice(0, 240),
          careReferralId,
          // transcriptUrl is filled in later when the P3 client knows it
        });
      } catch (err) {
        console.error('Alerts Log save failed:', err);
      }
      try {
        await saveCareReferralLog({
          careReferralId,
          conversationId: body.p3ConversationId,
          timestamp: new Date().toISOString(),
          clientName: '',
          clientAge: '',
          clientGender: '',
          careProviderName: 'SCH Tele-Health',
          careProviderTownship: '',
          careProviderContact: '',
          reasonForReferral: reasonParts.join(' | '),
          status: 'Pending',
          followUpDate: '',
          notes: `User message: ${body.userMessage.slice(0, 200)}`,
          patientTbCaseId: body.patientTbCaseId || '',
          patientContact: body.patientContact || '',
        });
      } catch (err) {
        console.error('Care referral log save failed:', err);
        // Continue — surfacing the chat reply to the user is more
        // important than the audit log in this code path.
      }
    }

    const estCostUsd = estimateCostUsd(modelId, result.promptTokens, result.completionTokens);

    return NextResponse.json({
      success: true,
      reply: finalReplyMm,            // legacy single-language reply
      replyMm: finalReplyMm,
      replyEn: finalReplyEn,
      escalation: {
        level: finalLevel,
        llmLevel,
        ruleLevel: preCheck.level,
        ruleMatches: preCheck.matches,
        careReferralId,
      },
      tokens: {
        prompt: result.promptTokens,
        completion: result.completionTokens,
      },
      model: result.model,
      estCostUsd,
      finishReason: result.finishReason,
      // v1.9.0 — expose retrieved chunks so the dev panel can display
      // what the LLM was grounded on this turn (source + similarity).
      retrieved: kbChunks.map(c => ({
        tag: `S${kbChunks.indexOf(c) + 1}`,
        sourceTitle: c.sourceTitle,
        sourceUrl: c.sourceUrl,
        similarity: Number(c.similarity.toFixed(3)),
        preview: c.content.slice(0, 220),
      })),
    });
  } catch (err) {
    console.error('P3 chat endpoint error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
