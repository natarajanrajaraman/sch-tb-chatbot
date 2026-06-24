'use client';

import { useState, useEffect, useCallback } from 'react';
import AuthGate from '@/components/AuthGate';
import CareReferralLogTable from '@/components/dashboard/CareReferralLogTable';

export default function ScreeningProviderPage() {
  return (
    <AuthGate roleKey="screening-provider" roleLabel="TB Screening Provider View">
      <ScreeningProviderInner />
    </AuthGate>
  );
}

function ScreeningProviderInner() {
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
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">TB Screening Provider View — SCH TB Chatbot</h1>
          <p className="text-xs text-gray-400">Read-only view of care referrals routed from the chatbot.</p>
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
      <div className="p-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading data…</div>
        ) : (
          <CareReferralLogTable data={data} onRefresh={fetchData} editable={false} />
        )}
      </div>
    </div>
  );
}
