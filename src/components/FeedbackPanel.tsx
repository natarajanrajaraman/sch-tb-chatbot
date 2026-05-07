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
    <div className="border-t border-gray-700/30 bg-gray-800/30 px-2 py-2">
      <div className="text-[9px] font-medium text-gray-500 uppercase tracking-wider mb-1">Tester Feedback</div>
      <div className="flex gap-1">
        <input
          type="text"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Feedback..."
          className="flex-1 px-2 py-1 text-[10px] bg-gray-700/30 text-gray-300 border border-gray-600/30 rounded outline-none focus:border-gray-500 placeholder-gray-600"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <button
          onClick={handleSubmit}
          disabled={!feedback.trim() || isSubmitting}
          className="px-2 py-1 text-[9px] bg-gray-600/50 text-gray-400 rounded hover:bg-gray-600 disabled:opacity-30 transition-colors"
        >
          {submitted ? '✓' : '→'}
        </button>
      </div>
    </div>
  );
}
