import { useEffect } from 'react';
import { AdminLayout, StatCard, DataTable } from '../../../layouts/AdminLayout.jsx';
import { useAdmin } from '../../../context/AdminContext.jsx';

export default function SubscriptionBilling() {
  const { subscriptions, loading, error, fetchSubscriptions } = useAdmin();

  useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

  if (loading && subscriptions.length === 0) {
    return (
      <AdminLayout title="Subscription & Billing" subtitle="Track plans, payments, seat usage, invoices and upcoming renewals.">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error && subscriptions.length === 0) {
    return (
      <AdminLayout title="Subscription & Billing" subtitle="Track plans, payments, seat usage, invoices and upcoming renewals.">
        <div className="rounded-xl border border-error bg-error-container p-md text-error font-bold">
          Failed to load subscriptions: {error}
        </div>
      </AdminLayout>
    );
  }

  const columns = ['Institution','Plan','Amount','Status','Renewal','Action'];

  return (
    <AdminLayout title="Subscription & Billing" subtitle="Track plans, payments, seat usage, invoices and upcoming renewals.">
      <div className="mb-lg grid grid-cols-1 gap-gutter md:grid-cols-4">
        <StatCard label="Monthly Revenue" value="—" icon="currency_rupee"/>
        <StatCard label="Enterprise Plans" value={subscriptions.filter(s => (s.plan || s[1])?.toLowerCase().includes('enterprise')).length.toString() || '—'} icon="workspace_premium"/>
        <StatCard label="Due Invoices" value="—" icon="receipt_long" tone="secondary"/>
        <StatCard label="Over Limit" value="—" icon="warning" tone="error"/>
      </div>
      <DataTable
        columns={columns}
        rows={subscriptions}
        renderRow={(r) => (
          <tr key={r.id || r[0]} className="hover:bg-surface-container">
            <td className="px-md py-md font-bold">{r.institution || r[0]}</td>
            <td className="px-md py-md">{r.plan || r[1]}</td>
            <td className="px-md py-md">{r.amount || r[2]}</td>
            <td className="px-md py-md"><span className="rounded-full bg-surface-container px-sm py-xs text-xs font-bold">{r.status || r[3]}</span></td>
            <td className="px-md py-md">{r.renewal || r[4]}</td>
            <td className="px-md py-md text-right"><button className="rounded bg-primary px-md py-xs text-sm text-white">Invoice</button></td>
          </tr>
        )}
      />
    </AdminLayout>
  );
}
