'use client';

import { Message } from '@/lib/chatEngine';

interface TranslationPanelProps {
  messages: Message[];
  isOpen: boolean;
  onToggle: () => void;
}

export default function TranslationPanel({ messages, isOpen, onToggle }: TranslationPanelProps) {
  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute top-16 right-0 z-20 bg-gray-800 text-white px-2 py-3 text-xs rounded-l-md shadow-lg hover:bg-gray-700 transition-colors"
        style={{ writingMode: 'vertical-rl' }}
      >
        {isOpen ? 'Close' : 'EN Translation'}
      </button>

      {/* Panel */}
      <div
        className={`bg-gray-50 border-l border-gray-200 flex flex-col transition-all duration-300 ${
          isOpen ? 'w-[350px]' : 'w-0 overflow-hidden'
        }`}
      >
        {isOpen && (
          <>
            <div className="bg-gray-800 text-white px-4 py-3 text-sm font-semibold flex items-center gap-2">
              <span>🌐</span>
              <span>English Translation</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((msg) => (
                <div key={`trans-${msg.id}`} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[90%] px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap rounded-lg ${
                      msg.sender === 'user'
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-white text-gray-800 border border-gray-200'
                    }`}
                  >
                    <div className="text-[10px] font-semibold mb-1 opacity-60 uppercase">
                      {msg.sender === 'user' ? 'User' : 'Bot'}
                    </div>
                    {msg.textEn}
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center text-gray-400 text-xs mt-8">
                  English translations will appear here as the conversation progresses.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
