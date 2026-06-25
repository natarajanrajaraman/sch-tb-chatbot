'use client';

import { useState, useEffect, useCallback } from 'react';
import AuthGate from '@/components/AuthGate';
import SpeedbackShell from '@/components/SpeedbackShell';
import CareReferralLogTable from '@/components/dashboard/CareReferralLogTable';

export default function CareProviderPage() {
  return (
    <AuthGate roleKey="care-provider" roleLabel="TB Care Provider View">
      <CareProviderInner />
    </AuthGate>
  );
}

function CareProviderInner() {
  const [data, setData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/care-referral-log');
      const json = await res.json();
      setData(json.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <SpeedbackShell
      title="TB Care Provider"
      subtitle="View + edit the Care Referral Log."
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
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading data…</div>
      ) : (
        <CareReferralLogTable data={data} onRefresh={fetchData} editable={true} />
      )}
    </SpeedbackShell>
  );
}
