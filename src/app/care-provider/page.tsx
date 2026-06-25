'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import AuthGate from '@/components/AuthGate';
import SpeedbackShell from '@/components/SpeedbackShell';
import CareReferralLogTable from '@/components/dashboard/CareReferralLogTable';
import ScreeningReferralLogTable from '@/components/dashboard/ScreeningReferralLogTable';

type TabType = 'screening-tb' | 'care';

export default function CareProviderPage() {
  return (
    <AuthGate roleKey="care-provider" roleLabel="TB Care Provider View">
      <CareProviderInner />
    </AuthGate>
  );
}

function CareProviderInner() {
  const [activeTab, setActiveTab] = useState<TabType>('screening-tb');
  const [screening, setScreening] = useState<string[][]>([]);
  const [care, setCare] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        fetch('/api/referral-log'),
        fetch('/api/care-referral-log'),
      ]);
      const sj = await s.json();
      const cj = await c.json();
      setScreening(sj.data || []);
      setCare(cj.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // v1.7.2 — Screening Referral filter for the TB Care Provider view.
  // Keep only rows that look TB-positive:
  //   CXR Result = '+ve'  OR
  //   Xpert Result ∈ {T, TT, RR}  OR
  //   Patient Dx = 'Confirmed TB +ve'
  const tbPositiveScreening = useMemo<string[][]>(() => {
    const headers = screening[0] || [];
    if (headers.length === 0) return screening;
    const cxrIdx = headers.indexOf('cxrResult');
    const xpertIdx = headers.indexOf('xpertResult');
    const dxIdx = headers.indexOf('patientDx');
    const xpertPositive = new Set(['T', 'TT', 'RR']);
    const rows = screening.slice(1).filter(r => {
      const cxr = (r[cxrIdx] || '').trim();
      const xpert = (r[xpertIdx] || '').trim();
      const dx = (r[dxIdx] || '').trim();
      return cxr === '+ve' || xpertPositive.has(xpert) || dx === 'Confirmed TB +ve';
    });
    return [headers, ...rows];
  }, [screening]);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'screening-tb', label: 'Screening Referral (New Dx TB)', icon: '🩻' },
    { id: 'care', label: 'Care Referral', icon: '🤝' },
  ];

  return (
    <SpeedbackShell
      title="TB Care Provider"
      activeView="care-provider"
      rightActions={
        <>
          <button
            onClick={fetchData}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 shadow-sm"
          >
            🔄 Refresh
          </button>
          <a
            href="/"
            className="px-3 py-1.5 bg-white text-slate-700 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            ← Back to Chat
          </a>
        </>
      }
    >
      {/* Tabs row */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-4 px-2 flex gap-0 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div>
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading data…</div>
        ) : activeTab === 'screening-tb' ? (
          <ScreeningReferralLogTable
            data={tbPositiveScreening}
            onRefresh={fetchData}
            editable={true}
            userRole="care-provider"
          />
        ) : (
          <CareReferralLogTable
            data={care}
            onRefresh={fetchData}
            editable={true}
          />
        )}
      </div>
    </SpeedbackShell>
  );
}
