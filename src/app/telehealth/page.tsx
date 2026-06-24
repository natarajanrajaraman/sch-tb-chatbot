'use client';

import { useState, useEffect, useCallback } from 'react';
import AuthGate from '@/components/AuthGate';
import ScreeningReferralLogTable from '@/components/dashboard/ScreeningReferralLogTable';
import CareReferralLogTable from '@/components/dashboard/CareReferralLogTable';

type TabType = 'screening' | 'care';

export default function TelehealthPage() {
  return (
    <AuthGate roleKey="sch-telehealth" roleLabel="SCH Telehealth View">
      <TelehealthInner />
    </AuthGate>
  );
}

function TelehealthInner() {
  const [activeTab, setActiveTab] = useState<TabType>('screening');
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

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'screening', label: 'Screening Referral Log', icon: '🏥' },
    { id: 'care', label: 'Care Referral Log', icon: '🤝' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">SCH Telehealth View — SCH TB Chatbot</h1>
          <p className="text-xs text-gray-400">View and edit screening referrals AND care referrals for individual clients.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
          >
            🔄 Refresh
          </button>
          <a href="/" className="px-3 py-1.5 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-500">
            ← Back to Chat
          </a>
        </div>
      </div>

      <div className="bg-white border-b px-6 flex gap-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading data…</div>
        ) : activeTab === 'screening' ? (
          <ScreeningReferralLogTable data={screening} onRefresh={fetchData} editable={true} />
        ) : (
          <CareReferralLogTable data={care} onRefresh={fetchData} editable={true} />
        )}
      </div>
    </div>
  );
}
