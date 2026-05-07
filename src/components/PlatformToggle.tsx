'use client';

import { PlatformType, PLATFORM_THEMES, PLATFORM_ORDER } from '@/data/platformThemes';

interface PlatformToggleProps {
  currentPlatform: PlatformType;
  onPlatformChange: (platform: PlatformType) => void;
}

export default function PlatformToggle({ currentPlatform, onPlatformChange }: PlatformToggleProps) {
  return (
    <div className="flex items-center gap-0.5 bg-white/10 rounded px-0.5 py-0.5">
      {PLATFORM_ORDER.map((p) => {
        const theme = PLATFORM_THEMES[p];
        const isActive = p === currentPlatform;
        return (
          <button
            key={p}
            onClick={() => onPlatformChange(p)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-all ${
              isActive
                ? 'bg-white text-gray-900'
                : 'text-white/50 hover:text-white/80 hover:bg-white/10'
            }`}
            title={theme.name}
          >
            {theme.headerIcon}
          </button>
        );
      })}
    </div>
  );
}
