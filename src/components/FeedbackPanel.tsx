'use client';

import { useState } from 'react';

interface FeedbackPanelProps {
  conversationId: string;
  platformView: string;
}

export default function FeedbackPanel({ conversationId, platformView }: FeedbackPanelProps) {
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          feedbackText: feedback,
          platformView,
        }),
      });
      setSubmitted(true);
      setFeedback('');
      setTimeout(() => setSubmitted(false), 3000);
    } catch {
      // Silently fail for prototype
    }
    setIsSubmitting(false);
  };

  return (
    <div className="border-t border-gray-200 bg-gray-50 p-3">
      <div className="text-xs font-semibold text-gray-500 mb-2">Tester Feedback</div>
      <div className="flex gap-2">
        <input
          type="text"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Enter feedback about this experience..."
          className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-blue-400"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <button
          onClick={handleSubmit}
          disabled={!feedback.trim() || isSubmitting}
          className="px-3 py-2 text-xs bg-gray-800 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {submitted ? '✓ Sent' : 'Send'}
        </button>
      </div>
    </div>
  );
}
