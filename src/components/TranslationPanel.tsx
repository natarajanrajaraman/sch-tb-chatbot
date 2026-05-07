'use client';

import { Message } from '@/lib/chatEngine';
import { useEffect, useRef } from 'react';

interface TranslationPanelProps {
  messages: Message[];
}

export default function TranslationPanel({ messages }: TranslationPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gray-800/40 border-l border-gray-700/50">
      <div className="px-2.5 py-1.5 text-[9px] font-medium text-gray-500 uppercase tracking-wider border-b border-gray-700/30">
        English Translation
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
        {messages.map((msg) => (
          <div key={`trans-${msg.id}`} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[95%] px-2 py-1 leading-relaxed whitespace-pre-wrap rounded ${
                msg.sender === 'user'
                  ? 'bg-blue-900/20 text-blue-300/50'
                  : 'bg-gray-700/20 text-gray-400/60'
              }`}
              style={{ fontSize: '10px' }}
            >
              <span className="font-semibold opacity-50 uppercase" style={{ fontSize: '8px' }}>
                {msg.sender === 'user' ? 'U: ' : 'B: '}
              </span>
              {msg.textEn}
              {msg.sender === 'bot' && msg.options && msg.options.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {msg.options.map((opt) => (
                    <span
                      key={opt.id}
                      className="inline-block px-1.5 py-0.5 rounded bg-gray-600/30 text-gray-400/70"
                      style={{ fontSize: '8px' }}
                    >
                      {opt.labelEn}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center text-gray-600 mt-4" style={{ fontSize: '9px' }}>
            Translations appear here.
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
