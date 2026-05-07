import { NextRequest, NextResponse } from 'next/server';
import { saveFeedback, getAllFeedback } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const feedbackId = `FB-${Date.now()}`;

    await saveFeedback(
      feedbackId,
      body.conversationId,
      body.feedbackText,
      body.platformView,
      body.snapshot || ''
    );

    return NextResponse.json({ success: true, feedbackId });
  } catch (error) {
    console.error('Error saving feedback:', error);
    return NextResponse.json({ success: false, error: 'Failed to save feedback' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const data = await getAllFeedback();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error getting feedback:', error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
