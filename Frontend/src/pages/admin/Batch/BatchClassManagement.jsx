import { useEffect, useState } from 'react';
import { AdminLayout, DataTable } from '../../../layouts/AdminLayout.jsx';
import { useAdmin } from '../../../context/AdminContext.jsx';

export default function BatchClassManagement() {
  const { batches, loading, error, fetchBatches, addBatch } = useAdmin();
  const [adding, setAdding] = useState(false);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  async function handleAdd() {
    setAdding(true);
    try {
      await addBatch({ name: `Batch ${batches.length + 1}` });
    } finally {
      setAdding(false);
    }
  }

  if (loading && batches.length === 0) {
    return (
      <AdminLayout title="Batch & Class Management" subtitle="Create, organize and assign classes across departments." actionLabel="Add Batch">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error && batches.length === 0) {
    return (
      <AdminLayout title="Batch & Class Management" subtitle="Create, organize and assign classes across departments." actionLabel="Add Batch">
        <div className="rounded-xl border border-error bg-error-container p-md text-error font-bold">
          Failed to load batches: {error}
        </div>
      </AdminLayout>
    );
  }

  const columns = ['Batch','Department','Students','Teachers','Status','Action'];

  return (
    <AdminLayout title="Batch & Class Management" subtitle="Create, organize and assign classes across departments." actionLabel="Add Batch">
      <div className="mb-md flex justify-end">
        <button onClick={handleAdd} disabled={adding} className="rounded-lg bg-primary px-md py-sm text-sm font-bold text-white disabled:opacity-50">
          {adding ? 'Adding...' : 'Add Batch'}
        </button>
      </div>
      <DataTable
        columns={columns}
        rows={batches}
        renderRow={(r) => (
          <tr key={r.id || r[0]} className="hover:bg-surface-container">
            <td className="px-md py-md font-bold">{r.name || r[0]}</td>
            <td className="px-md py-md">{r.department || r[1]}</td>
            <td className="px-md py-md">{r.students ?? r[2]}</td>
            <td className="px-md py-md">{r.teachers ?? r[3]}</td>
            <td className="px-md py-md"><span className="rounded-full bg-surface-container px-sm py-xs text-xs font-bold">{r.status || r[4]}</span></td>
            <td className="px-md py-md text-right"><button className="rounded bg-surface-container-high px-md py-xs text-sm">Manage</button></td>
          </tr>
        )}
      />
    </AdminLayout>
  );
}
