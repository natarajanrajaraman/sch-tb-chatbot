'use client';

import { useState, ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  // Style preset matched to the debug panel's existing toggle look.
  variant?: 'default' | 'translation';
}

export default function CollapsibleSection({ title, defaultOpen = false, children, variant = 'default' }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  const headerClass = variant === 'translation'
    ? `px-3 py-1.5 text-[10px] font-medium tracking-wider uppercase text-left border-b border-gray-700/30 transition-colors shrink-0 ${
        open
          ? 'bg-blue-900/30 text-blue-300'
          : 'bg-gray-800/40 text-gray-500 hover:text-gray-300 hover:bg-gray-800/60'
      }`
    : `w-full px-3 py-1.5 text-[10px] font-medium tracking-wider uppercase text-left border-b border-gray-700/30 transition-colors shrink-0 ${
        open
          ? 'bg-gray-800/50 text-gray-200'
          : 'bg-gray-800/40 text-gray-500 hover:text-gray-300 hover:bg-gray-800/60'
      }`;

  return (
    <div className="shrink-0">
      <button onClick={() => setOpen(!open)} className={headerClass}>
        {open ? '▾' : '▸'} {title}
      </button>
      {open && children}
    </div>
  );
}
