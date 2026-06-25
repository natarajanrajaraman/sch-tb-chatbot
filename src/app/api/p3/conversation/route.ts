import { NextRequest, NextResponse } from 'next/server';
import { upsertP3Conversation, P3ConversationRow } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<P3ConversationRow>;
    if (!body.p3ConversationId) {
      return NextResponse.json(
        { success: false, error: 'p3ConversationId required' },
        { status: 400 }
      );
    }
    await upsertP3Conversation({
      p3ConversationId: body.p3ConversationId,
      startedAt: body.startedAt || new Date().toISOString(),
      lastMessageAt: body.lastMessageAt || new Date().toISOString(),
      model: body.model || '',
      userMessageCount: body.userMessageCount || 0,
      totalPromptTokens: body.totalPromptTokens || 0,
      totalCompletionTokens: body.totalCompletionTokens || 0,
      estCostUsd: body.estCostUsd || 0,
      lastEscalationLevel: body.lastEscalationLevel || 'none',
      escalationsCount: body.escalationsCount || 0,
      careReferralIds: body.careReferralIds || '',
      platformView: body.platformView || '',
      botVersion: body.botVersion || '',
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('P3 conversation upsert error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
