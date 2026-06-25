'use client';

import { useState, useEffect, useCallback } from 'react';
import AuthGate from '@/components/AuthGate';
import SpeedbackShell from '@/components/SpeedbackShell';
import ScreeningReferralLogTable from '@/components/dashboard/ScreeningReferralLogTable';
import CareReferralLogTable from '@/components/dashboard/CareReferralLogTable';
import AlertsLogTable from '@/components/dashboard/AlertsLogTable';
import TelehealthDashboard from '@/components/dashboard/TelehealthDashboard';

type TabType = 'dashboard' | 'screening' | 'care' | 'alerts';

export default function TelehealthPage() {
  return (
    <AuthGate roleKey="sch-telehealth" roleLabel="SCH Tele-Health View">
      <TelehealthInner />
    </AuthGate>
  );
}

function TelehealthInner() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [screening, setScreening] = useState<string[][]>([]);
  const [care, setCare] = useState<string[][]>([]);
  const [alerts, setAlerts] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  // When the dashboard wants to deep-link to a specific row in one of the
  // log tabs (so the click-target row auto-expands), it sets this id.
  const [expandRecordId, setExpandRecordId] = useState<string | null>(null);
  // v1.7 — when an outcome card is clicked on the Dashboard, jump to the
  // corresponding log tab and filter the table to just that bucket.
  const [scBucketFilter, setScBucketFilter] = useState<import('@/lib/journeyState').OverallBucket | null>(null);
  const [careBucketFilter, setCareBucketFilter] = useState<import('@/lib/journeyState').OverallBucket | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, a] = await Promise.all([
        fetch('/api/referral-log'),
        fetch('/api/care-referral-log'),
        fetch('/api/alerts-log'),
      ]);
      const sj = await s.json();
      const cj = await c.json();
      const aj = await a.json();
      setScreening(sj.data || []);
      setCare(cj.data || []);
      setAlerts(aj.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAlertCount = (alerts.length > 1 ? alerts.slice(1) : []).filter(r => !r[9] || r[9] === 'Open').length;

  const tabs: { id: TabType; label: string; icon: string; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'screening', label: 'Screening Referral Log', icon: '🏥' },
    { id: 'care', label: 'Care Referral Log', icon: '🤝' },
    { id: 'alerts', label: 'Alerts Log', icon: '⚠️', badge: openAlertCount },
  ];

  return (
    <SpeedbackShell
      title="SCH Tele-Health"
      activeView="telehealth"
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
            {t.badge != null && t.badge > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-semibold">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      <div>
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading data…</div>
        ) : activeTab === 'dashboard' ? (
          <TelehealthDashboard
            screeningData={screening}
            careData={care}
            alertsData={alerts}
            onJumpToTab={setActiveTab}
            onJumpToRecord={(tab, recordId) => {
              setActiveTab(tab);
              setExpandRecordId(recordId);
            }}
            onJumpToBucket={(tab, bucket) => {
              setActiveTab(tab);
              if (tab === 'screening') setScBucketFilter(bucket);
              else setCareBucketFilter(bucket);
            }}
          />
        ) : activeTab === 'screening' ? (
          <ScreeningReferralLogTable
            data={screening}
            onRefresh={fetchData}
            editable={true}
            userRole="telehealth"
            expandRecordId={expandRecordId}
            onExpandHandled={() => setExpandRecordId(null)}
            bucketFilter={scBucketFilter}
            onClearBucketFilter={() => setScBucketFilter(null)}
          />
        ) : activeTab === 'care' ? (
          <CareReferralLogTable
            data={care}
            onRefresh={fetchData}
            editable={true}
            expandRecordId={expandRecordId}
            onExpandHandled={() => setExpandRecordId(null)}
          />
        ) : (
          <AlertsLogTable
            data={alerts}
            onRefresh={fetchData}
            editable={true}
            expandRecordId={expandRecordId}
            onExpandHandled={() => setExpandRecordId(null)}
          />
        )}
      </div>
    </SpeedbackShell>
  );
}
