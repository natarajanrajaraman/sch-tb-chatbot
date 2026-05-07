'use client';

import { PlatformType, PLATFORM_THEMES } from '@/data/platformThemes';

interface PlatformToggleProps {
  currentPlatform: PlatformType;
  onPlatformChange: (platform: PlatformType) => void;
}

const PLATFORM_ORDER: PlatformType[] = ['web', 'messenger', 'telegram', 'viber'];

export default function PlatformToggle({ currentPlatform, onPlatformChange }: PlatformToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-white/10 rounded-full px-1 py-0.5">
      {PLATFORM_ORDER.map((p) => {
        const theme = PLATFORM_THEMES[p];
        const isActive = p === currentPlatform;
        return (
          <button
            key={p}
            onClick={() => onPlatformChange(p)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              isActive
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
            title={theme.name}
          >
            {theme.headerIcon} {theme.name.split(' ')[0]}
          </button>
        );
      })}
    </div>
  );
}
