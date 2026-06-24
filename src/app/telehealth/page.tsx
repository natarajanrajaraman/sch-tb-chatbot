'use client';

import { useState, useEffect, useCallback } from 'react';
import AuthGate from '@/components/AuthGate';
import ScreeningReferralLogTable from '@/components/dashboard/ScreeningReferralLogTable';

export default function TelehealthPage() {
  return (
    <AuthGate roleKey="sch-telehealth" roleLabel="SCH Telehealth View">
      <TelehealthInner />
    </AuthGate>
  );
}

function TelehealthInner() {
  const [data, setData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/referral-log');
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
          <h1 className="text-lg font-bold">SCH Telehealth View — SCH TB Chatbot</h1>
          <p className="text-xs text-gray-400">View and edit screening referral follow-ups for individual clients.</p>
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
          <ScreeningReferralLogTable data={data} onRefresh={fetchData} editable={true} />
        )}
      </div>
    </div>
  );
}
