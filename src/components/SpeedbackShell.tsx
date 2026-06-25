'use client';

import { ReactNode } from 'react';

// Speedback-style layout shell for the SCH back-end dashboards. Matches
// the Speedback platform's visual language so SCH reviewers transition
// from this prototype to the production build with minimal friction.
//
// Layout:
//   ┌────────────────────────────────────────────────────────────────┐
//   │ ⚠️ Sandbox / Prototype banner (amber)                          │
//   ├──────┬─────────────────────────────────────────────────────────┤
//   │ ▶    │ [Speedback]                Search by name…       🔔     │
//   │ Side │ ─────────────────────────────────────────────────────── │
//   │ Nav  │                                                         │
//   │      │  <children>                                             │
//   │      │                                                         │
//   ├──────┴─────────────────────────────────────────────────────────┤
//   │ 🔔 Prototype banner (blue, dismissible)                        │
//   └────────────────────────────────────────────────────────────────┘

interface SpeedbackShellProps {
  title: string;
  subtitle?: ReactNode;
  activeView: 'admin' | 'telehealth' | 'screening-provider' | 'care-provider';
  rightActions?: ReactNode;
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  children: ReactNode;
}

const NAV_ITEMS = [
  { key: 'admin' as const, label: 'SCH Admin', icon: '⚙️', href: '/admin' },
  { key: 'telehealth' as const, label: 'Telehealth', icon: '📊', href: '/telehealth' },
  { key: 'screening-provider' as const, label: 'Screening Provider', icon: '🏥', href: '/screening-provider' },
  { key: 'care-provider' as const, label: 'Care Provider', icon: '🤝', href: '/care-provider' },
];

export default function SpeedbackShell({ title, subtitle, activeView, rightActions, search, children }: SpeedbackShellProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAF7F2' }}>
      {/* Sandbox / Prototype banner */}
      <div className="bg-amber-100 text-amber-900 text-xs px-4 py-1.5 text-center font-medium border-b border-amber-200">
        ⚠️ Prototype Environment — design mirrors Speedback for SCH preview
      </div>

      {/* Main: sidebar + content */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside className="w-16 md:w-20 bg-slate-900 text-white flex flex-col items-center py-4 shrink-0">
          {/* Brand logo at top */}
          <a href="/" className="mb-6 block" title="Back to chatbot">
            <img src="/speedback-logo.svg" alt="Speedback (mock)" className="w-9 h-9" />
          </a>
          {/* Nav icons */}
          <nav className="flex flex-col gap-2">
            {NAV_ITEMS.map(item => {
              const active = item.key === activeView;
              return (
                <a
                  key={item.key}
                  href={item.href}
                  title={item.label}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg transition-colors ${
                    active
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                </a>
              );
            })}
          </nav>
          {/* Settings / theme at bottom (placeholders) */}
          <div className="mt-auto flex flex-col gap-2 pb-2 opacity-50">
            <button title="Settings (placeholder)" className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800">⚙</button>
            <button title="Theme (placeholder)" className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800">🌙</button>
          </div>
        </aside>

        {/* Content column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header bar — brand + search + actions */}
          <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2 shrink-0">
              <img src="/speedback-logo.svg" alt="Speedback" className="w-8 h-8" />
              <span className="text-lg font-bold text-slate-900">Speedback</span>
              <span className="text-xs text-slate-400 ml-2 hidden md:inline">(mock UI for SCH preview)</span>
            </div>
            {search && (
              <div className="flex-1 max-w-md mx-auto">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  <input
                    type="text"
                    value={search.value}
                    onChange={e => search.onChange(e.target.value)}
                    placeholder={search.placeholder || 'Search by name…'}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white"
                  />
                </div>
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              {rightActions}
              <button title="Notifications (placeholder)" className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0"/></svg>
              </button>
            </div>
          </header>

          {/* Page title strip */}
          <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>

          {/* Children area — scrollable */}
          <main className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
