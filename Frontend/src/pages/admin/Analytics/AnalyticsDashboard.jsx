import { useEffect, useState } from 'react';
import { AdminLayout, StatCard, Icon } from '../../../layouts/AdminLayout.jsx';
import { useAdmin } from '../../../context/AdminContext.jsx';

export default function AnalyticsDashboard() {
  const [range, setRange] = useState('24 Hours');
  const { analytics, loading, error, fetchAnalytics } = useAdmin();

  useEffect(() => { fetchAnalytics(range); }, [fetchAnalytics, range]);

  if (loading && !analytics) {
    return (
      <AdminLayout title="Global Platform Health" subtitle="Live monitoring of EduSecure infrastructure and proctoring throughput." searchPlaceholder="Search analytics...">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error && !analytics) {
    return (
      <AdminLayout title="Global Platform Health" subtitle="Live monitoring of EduSecure infrastructure and proctoring throughput." searchPlaceholder="Search analytics...">
        <div className="rounded-xl border border-error bg-error-container p-md text-error font-bold">
          Failed to load analytics: {error}
        </div>
      </AdminLayout>
    );
  }

  const d = analytics || {};
  const statCards = d.stats || [
    { label: 'System Uptime', value: '—', icon: 'check_circle' },
    { label: 'AI Latency', value: '—', icon: 'bolt' },
    { label: 'Live Sessions', value: '—', icon: 'sensors' },
    { label: 'Threat Blocks', value: '—', icon: 'shield_lock', tone: 'secondary' },
  ];
  const throughputData = d.throughputData || [];
  const regions = d.regions || [];
  const events = d.events || [];

  return (
    <AdminLayout title="Global Platform Health" subtitle="Live monitoring of EduSecure infrastructure and proctoring throughput." searchPlaceholder="Search analytics...">
      <div className="mb-md flex justify-end">
        <div className="rounded-lg bg-surface-container-high p-1">
          {['24 Hours','7 Days','30 Days'].map(r => (
            <button key={r} onClick={() => setRange(r)} className={`rounded-md px-4 py-1.5 text-sm font-semibold ${range===r?'bg-white shadow-sm':'text-on-surface-variant'}`}>{r}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-12 gap-gutter">
        {statCards.map((s, i) => (
          <div key={i} className="col-span-12 md:col-span-3">
            <StatCard label={s.label} value={s.value} icon={s.icon} tone={s.tone} sub={s.sub} />
          </div>
        ))}
        <section className="bento-card chart-grid col-span-12 p-md md:col-span-8">
          <div className="flex justify-between">
            <h3 className="text-xl font-bold">Throughput & Latency</h3>
            <span className="text-sm text-on-surface-variant">{range}</span>
          </div>
          <div className="mt-lg flex h-72 items-end gap-sm">
            {throughputData.length === 0 ? <div className="w-full flex items-center justify-center text-on-surface-variant text-sm">Throughput data pending from server.</div> : throughputData.map((h, i) => <div key={i} className="flex-1 rounded-t bg-primary" style={{height:`${h}%`}}></div>)}
          </div>
        </section>
        <section className="bento-card col-span-12 p-md md:col-span-4">
          <h3 className="mb-md text-xl font-bold">Regional Load</h3>
            {regions.length === 0 ? <p className="text-sm text-on-surface-variant">Regional data pending from server.</p> : regions.map(([n, v]) => (
            <div key={n} className="mb-md">
              <div className="mb-xs flex justify-between text-sm"><span>{n}</span><b>{v}%</b></div>
              <div className="h-2 rounded-full bg-surface-container"><div className="h-full rounded-full bg-secondary" style={{width:`${v}%`}}></div></div>
            </div>
          ))}
          
        </section>
        <section className="bento-card col-span-12 p-md">
          <h3 className="mb-md text-xl font-bold">Security Event Timeline</h3>
          <div className="grid gap-sm md:grid-cols-4">
            {events.length === 0 ? <p className="text-sm text-on-surface-variant">No security events recorded.</p> : events.map((x, i) => (
              <div key={x} className="rounded-lg bg-surface-container-low p-sm">
                <p className="text-sm font-bold">{x}</p>
                <p className="text-xs text-on-surface-variant">{i+1}h ago • automated</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
