// Hierarchical location data — state/region → district → township.
// Source of truth: 'Location Hierarchy' tab on the main Google Sheet.
// Client loads this on session start; chatEngine reads via the helpers below.

export interface LocationEntry {
  stateRegionEn: string;
  stateRegionMm: string;
  districtEn: string;
  districtMm: string;
  townshipEn: string;
  townshipMm: string;
}

export interface LocationLabel {
  en: string;
  mm: string;
}

let locations: LocationEntry[] = [];

export function setLocations(l: LocationEntry[]): void {
  locations = Array.isArray(l) ? l : [];
}

export function getLocations(): LocationEntry[] {
  return locations;
}

export function getStates(): LocationLabel[] {
  const seen = new Set<string>();
  const out: LocationLabel[] = [];
  for (const l of locations) {
    const key = l.stateRegionEn || l.stateRegionMm;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ en: l.stateRegionEn, mm: l.stateRegionMm });
  }
  return out;
}

export function getDistricts(stateEn: string): LocationLabel[] {
  const seen = new Set<string>();
  const out: LocationLabel[] = [];
  for (const l of locations) {
    if (l.stateRegionEn !== stateEn) continue;
    const key = l.districtEn || l.districtMm;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ en: l.districtEn, mm: l.districtMm });
  }
  return out;
}

export function getTownships(stateEn: string, districtEn: string): LocationLabel[] {
  const out: LocationLabel[] = [];
  const seen = new Set<string>();
  for (const l of locations) {
    if (l.stateRegionEn !== stateEn || l.districtEn !== districtEn) continue;
    const key = l.townshipEn || l.townshipMm;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ en: l.townshipEn, mm: l.townshipMm });
  }
  return out;
}
