export type TextEntry = { en: string; mm: string };

let overrides: Record<string, TextEntry> = {};

export function setOverrides(o: Record<string, TextEntry>): void {
  overrides = o || {};
}

export function getOverrides(): Record<string, TextEntry> {
  return overrides;
}

export function t(key: string, fallback: TextEntry): TextEntry {
  const o = overrides[key];
  if (!o) return fallback;
  return {
    en: o.en && o.en.trim() ? o.en : fallback.en,
    mm: o.mm && o.mm.trim() ? o.mm : fallback.mm,
  };
}
