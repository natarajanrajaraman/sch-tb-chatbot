'use client';

import { useState, useEffect } from 'react';
import { PlatformTheme } from '@/data/platformThemes';
import { getStates, getDistricts, getTownships, setLocations, LocationEntry } from '@/lib/locationRegistry';

interface FindProviderFlowProps {
  theme: PlatformTheme;
  onComplete: (result: {
    stateRegionEn: string;
    districtEn: string;
    townshipEn: string;
    providers: ProviderSite[];
  }) => void;
  onCancel: () => void;
}

interface ProviderSite {
  site_id: string;
  facility_name: string;
  facility_name_mm?: string;
  address: string;
  phone: string;
  services: string;
  operating_hours: string;
}

type Step = 'state' | 'district' | 'township' | 'loading' | 'done';

// v1.0.0 — when a P3 user picks Self referral and wants help finding a
// new TB care provider, this widget walks them through State / Region
// → District → Township, then hits /api/referral-sites to fetch
// matching providers from the Referral Directory.
export default function FindProviderFlow({ theme, onComplete, onCancel }: FindProviderFlowProps) {
  const [step, setStep] = useState<Step>('state');
  const [stateEn, setStateEn] = useState('');
  const [districtEn, setDistrictEn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [locationsReady, setLocationsReady] = useState(false);

  // Locations are loaded on the page mount in page.tsx, but P3ChatPanel
  // is a sibling — re-fetch defensively so this widget works regardless.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/locations', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data?.rows) && data.rows.length > 0) {
            setLocations(data.rows as LocationEntry[]);
          }
        }
      } catch {
        // fall back to whatever the registry already has
      } finally {
        if (!cancelled) setLocationsReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handlePickState = (s: string) => { setStateEn(s); setStep('district'); };
  const handlePickDistrict = (d: string) => { setDistrictEn(d); setStep('township'); };
  const handlePickTownship = async (t: string) => {
    setStep('loading');
    setError(null);
    try {
      const res = await fetch(`/api/referral-sites?township=${encodeURIComponent(t)}`);
      const data = await res.json();
      const providers: ProviderSite[] = data?.sites || [];
      setStep('done');
      onComplete({ stateRegionEn: stateEn, districtEn, townshipEn: t, providers });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('township');
    }
  };

  if (!locationsReady) {
    return (
      <div className="flex justify-start" style={{ marginBottom: theme.messageGap }}>
        <div className="max-w-[90%] w-full">
          <div className="bg-blue-50 border-l-4 border-blue-400 rounded p-3 text-xs text-blue-900">
            Loading location list…
          </div>
        </div>
      </div>
    );
  }

  const states = getStates();
  const districts = stateEn ? getDistricts(stateEn) : [];
  const townships = stateEn && districtEn ? getTownships(stateEn, districtEn) : [];

  return (
    <div className="flex justify-start" style={{ marginBottom: theme.messageGap }}>
      <div className="max-w-[90%] w-full">
        <div
          className="shadow-sm border-l-4 border-blue-400 bg-blue-50 rounded p-3 space-y-2"
          style={{ fontSize: theme.fontSize, color: '#1e3a8a' }}
        >
          <div className="flex items-center justify-between">
            <div className="font-semibold">📍 Find a TB Care Provider</div>
            <button
              type="button"
              onClick={onCancel}
              className="text-[10px] text-blue-700 hover:text-blue-900"
            >
              Cancel
            </button>
          </div>

          {step === 'state' && (
            <>
              <div className="text-[11px] opacity-80">
                ကျေးဇူးပြု၍ သင်နေထိုင်ရာ တိုင်းဒေသကြီး/ပြည်နယ်ကို ရွေးပါ။<br />
                <span className="opacity-70">Please pick your State / Region.</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {states.map(s => (
                  <button
                    key={s.en}
                    onClick={() => handlePickState(s.en)}
                    className="px-2 py-1 text-[11px] bg-white border border-blue-300 rounded hover:border-blue-500"
                  >
                    {s.mm} <span className="opacity-60">/ {s.en}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'district' && (
            <>
              <div className="text-[11px] opacity-80">
                Selected: {stateEn} · <button onClick={() => { setStep('state'); setDistrictEn(''); }} className="underline">change</button>
              </div>
              <div className="text-[11px]">
                ခရိုင်ကို ရွေးပါ။ <span className="opacity-70">Pick your District.</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {districts.map(d => (
                  <button
                    key={d.en}
                    onClick={() => handlePickDistrict(d.en)}
                    className="px-2 py-1 text-[11px] bg-white border border-blue-300 rounded hover:border-blue-500"
                  >
                    {d.mm} <span className="opacity-60">/ {d.en}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'township' && (
            <>
              <div className="text-[11px] opacity-80">
                Selected: {stateEn} › {districtEn} · <button onClick={() => { setStep('district'); }} className="underline">change</button>
              </div>
              <div className="text-[11px]">
                မြို့နယ်ကို ရွေးပါ။ <span className="opacity-70">Pick your Township.</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {townships.length === 0 && <div className="text-[11px] text-amber-700">No townships in the placeholder data for this district. Pick another district or go back.</div>}
                {townships.map(t => (
                  <button
                    key={t.en}
                    onClick={() => handlePickTownship(t.en)}
                    className="px-2 py-1 text-[11px] bg-white border border-blue-300 rounded hover:border-blue-500"
                  >
                    {t.mm} <span className="opacity-60">/ {t.en}</span>
                  </button>
                ))}
              </div>
              {error && (
                <div className="text-[11px] text-red-700">{error}</div>
              )}
            </>
          )}

          {step === 'loading' && (
            <div className="text-[11px] opacity-80">Looking up providers near {stateEn} › {districtEn} …</div>
          )}
        </div>
      </div>
    </div>
  );
}
