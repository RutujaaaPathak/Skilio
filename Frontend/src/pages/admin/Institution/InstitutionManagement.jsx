import { useEffect } from 'react';
import { AdminLayout, Icon, DataTable } from '../../../layouts/AdminLayout.jsx';
import { useAdmin } from '../../../context/AdminContext.jsx';

function Card({icon,label,value,tag}) {
  return (
    <div className="bento-card col-span-12 p-md md:col-span-3">
      <div className="mb-sm flex justify-between">
        <span className="rounded-lg bg-primary-fixed p-sm"><Icon name={icon}/></span>
        <span className="text-xs font-bold text-emerald-600">{tag}</span>
      </div>
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-xs text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function InstitutionManagement() {
  const { institutions, loading, error, fetchInstitutions } = useAdmin();

  useEffect(() => { fetchInstitutions(); }, [fetchInstitutions]);

  if (loading && institutions.length === 0) {
    return (
      <AdminLayout title="Institution Management" subtitle="Monitor and manage access controls for partner academic organizations." searchPlaceholder="Search institutions...">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error && institutions.length === 0) {
    return (
      <AdminLayout title="Institution Management" subtitle="Monitor and manage access controls for partner academic organizations." searchPlaceholder="Search institutions...">
        <div className="rounded-xl border border-error bg-error-container p-md text-error font-bold">
          Failed to load institutions: {error}
        </div>
      </AdminLayout>
    );
  }

  const columns = ['Institution Name','Type','Active Licenses','Security Tier','Status','Action'];

  return (
    <AdminLayout title="Institution Management" subtitle="Monitor and manage access controls for partner academic organizations." searchPlaceholder="Search institutions...">
      <div className="mb-lg grid grid-cols-12 gap-gutter">
        <Card icon="account_balance" label="Total Institutions" value={institutions.length.toString() || '—'} tag="Active" />
        <Card icon="verified_user" label="Security Alerts" value="—" tag="—" />
        <div className="col-span-12 rounded-xl bg-primary p-md text-white md:col-span-6">
          <p className="text-sm opacity-80">Enterprise License Utilization</p>
          <p className="mt-xs text-2xl font-bold">—</p>
          <div className="mt-md h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full w-0 bg-secondary-container"></div></div>
          <p className="mt-sm text-xs opacity-70">Data pending from server.</p>
        </div>
      </div>
      <div className="mb-md flex flex-wrap items-center gap-md rounded-xl border border-outline-variant bg-white p-sm">
        <Icon name="filter_list"/><span className="text-sm font-bold">Filter by:</span>
        {['All Regions','Security Tier','Type'].map(x => <select key={x} className="rounded-lg border-none bg-surface-container px-sm py-xs text-sm"><option>{x}</option></select>)}
        <div className="flex-1"></div>
        <button className="text-sm text-on-surface-variant">Clear All</button>
      </div>
      <DataTable
        columns={columns}
        rows={institutions}
        renderRow={(r) => (
          <tr key={r.id || r.name} className={`${r.risk ? 'bg-error/5' : ''} hover:bg-surface-container-low`}>
            <td className="px-md py-md">
              <div className="flex items-center gap-sm">
                <div className={`flex h-10 w-10 items-center justify-center rounded font-bold ${r.risk ? 'bg-error-container text-error' : 'bg-surface-variant text-primary'}`}>{r.initials || r.name?.[0]}</div>
                <div>
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-xs text-on-surface-variant">{r.place || r.location || ''}</p>
                </div>
              </div>
            </td>
            <td className="px-md py-md"><span className="rounded-full bg-surface-container px-sm py-xs text-xs">{r.type || '—'}</span></td>
            <td className="px-md py-md font-medium">{r.licenses || '—'}</td>
            <td className="px-md py-md">{r.tier || '—'}</td>
            <td className={`px-md py-md font-bold ${r.risk ? 'text-error' : 'text-emerald-600'}`}>{r.status || '—'}</td>
            <td className="px-md py-md text-right">
              <button className={`rounded px-md py-xs text-sm font-semibold ${r.risk ? 'bg-error text-white' : 'bg-surface-container-high hover:bg-primary hover:text-white'}`}>
                {r.risk ? 'Resolve' : 'Portal'}
              </button>
            </td>
          </tr>
        )}
      />
      <div className="mt-lg grid grid-cols-12 gap-gutter">
        <div className="bento-card col-span-12 p-md md:col-span-8">
          <h3 className="mb-md text-xl font-bold">Tier Distribution</h3>
          <p className="text-sm text-on-surface-variant">Enterprise adoption data pending from server.</p>
        </div>
        <div className="bento-card col-span-12 p-md md:col-span-4">
          <h3 className="mb-sm text-xl font-bold">Sentinel Insight</h3>
          <p className="text-sm text-on-surface-variant">Awaiting server data for at-risk analysis.</p>
          <button className="mt-md w-full rounded-lg border-2 border-primary py-sm font-bold hover:bg-primary hover:text-white">View At-Risk Accounts</button>
        </div>
      </div>
    </AdminLayout>
  );
}
