import { useEffect } from 'react';
import { AdminLayout, StatCard, Icon, DataTable } from '../../../layouts/AdminLayout.jsx';
import { useAdmin } from '../../../context/AdminContext.jsx';

export default function AdminDashboard() {
  const { dashboard, loading, error, fetchDashboard } = useAdmin();

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (loading && !dashboard) {
    return (
      <AdminLayout title="System Oversight" subtitle="Real-time integrity and performance metrics across the enterprise.">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error && !dashboard) {
    return (
      <AdminLayout title="System Oversight" subtitle="Real-time integrity and performance metrics across the enterprise.">
        <div className="rounded-xl border border-error bg-error-container p-md text-error font-bold">
          Failed to load dashboard: {error}
        </div>
      </AdminLayout>
    );
  }

  const d = dashboard || {};
  const institutions = d.institutions || [];
  const statCards = d.stats || [
    { label: 'Total Institutions', value: '—', icon: 'account_balance' },
    { label: 'Active Exams', value: '—', icon: 'assignment', sub: 'sensors Live Session Monitoring' },
    { label: 'Global Integrity Score', value: '—', icon: 'verified_user', tone: 'secondary', sub: 'security Optimal Security Range' },
    { label: 'Revenue Trends', value: '—', icon: 'payments' },
  ];
  const chartMonths = d.chartMonths || [];
  const chartPrimary = d.chartPrimary || [];
  const chartSecondary = d.chartSecondary || [];
  const alerts = d.alerts || [];
  const tableColumns = d.tableColumns || ['Institution','Exams Conducted','Integrity Avg.','Region','Status'];

  return (
    <AdminLayout title="System Oversight" subtitle="Real-time integrity and performance metrics across the enterprise.">
      <div className="grid grid-cols-12 gap-gutter">
        {statCards.map((s, i) => (
          <div key={i} className="col-span-12 md:col-span-3">
            <StatCard label={s.label} value={s.value} icon={s.icon} tone={s.tone} sub={s.sub} />
          </div>
        ))}

        <section className="bento-card col-span-12 min-h-[400px] p-md md:col-span-8">
          <div className="mb-md flex items-center justify-between">
            <h3 className="text-xl font-bold text-primary">Institutional Growth & Exam Volume</h3>
            <select className="rounded-lg border-none bg-surface-container px-sm py-xs text-sm"><option>Last 6 Months</option><option>Year to Date</option></select>
          </div>
          <div className="flex h-64 items-end gap-md px-md">
            {chartMonths.length === 0 ? <div className="w-full flex items-center justify-center text-on-surface-variant text-sm">Chart data pending from server.</div> : chartMonths.map((m, i) => (
              <div key={m} className="flex h-full flex-1 cursor-pointer flex-col justify-end gap-xs">
                <div className="w-full rounded-t bg-primary-container" style={{height: `${chartPrimary[i]}%`}}></div>
                <div className="w-full rounded-t bg-secondary" style={{height: `${chartSecondary[i]}%`}}></div>
                <span className="mt-2 text-center text-[10px] font-bold">{m}</span>
              </div>
            ))}
          </div>
          <div className="mt-lg grid grid-cols-2 gap-md border-t border-outline-variant pt-md">
            <Legend color="bg-primary-container" text="Institutions Registered"/>
            <Legend color="bg-secondary" text="Successful Exam Executions"/>
          </div>
        </section>

        <section className="bento-card col-span-12 flex flex-col p-md md:col-span-4">
          <div className="mb-md flex items-center justify-between">
            <h3 className="text-xl font-bold text-primary">Critical Alerts</h3>
            {alerts.length > 0 && <span className="rounded bg-error-container px-2 py-1 text-[10px] font-bold text-error">{alerts.length} PRIORITY</span>}
          </div>
          {alerts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm">No active alerts</div>
          ) : (
            <div className="flex-1 space-y-md">
              {alerts.map((a) => (
                <div key={a.title} className={`flex gap-sm rounded-lg border-l-4 ${a.tone==='error'?'border-error':'border-secondary'} bg-surface-container-low p-sm`}>
                  <Icon name={a.icon} className={a.tone==='error'?'text-error':'text-secondary'} />
                  <div>
                    <h4 className="text-sm font-bold">{a.title}</h4>
                    <p className="mt-xs text-xs text-on-surface-variant">{a.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button className="mt-md w-full rounded-lg border border-secondary py-sm text-sm font-semibold text-secondary hover:bg-secondary-fixed">View Incident Log</button>
        </section>

        <section className="col-span-12">
          <DataTable
            columns={tableColumns}
            rows={institutions}
            renderRow={(r) => (
              <tr key={r[0]} className="hover:bg-surface-container">
                <td className="px-md py-md font-semibold">{r[0]}</td>
                <td className="px-md py-md">{r[1]}</td>
                <td className="px-md py-md"><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">{r[2]}</span></td>
                <td className="px-md py-md">{r[3]}</td>
                <td className="px-md py-md text-right"><span className={`font-bold ${r[4]==='Verified'?'text-emerald-600':'text-amber-600'}`}>{r[4]}</span></td>
              </tr>
            )}
          />
        </section>
      </div>
    </AdminLayout>
  );
}

function Legend({ color, text }) {
  return <div className="flex items-center gap-sm"><div className={`h-3 w-3 rounded-full ${color}`}></div><span className="text-sm text-on-surface-variant">{text}</span></div>;
}
