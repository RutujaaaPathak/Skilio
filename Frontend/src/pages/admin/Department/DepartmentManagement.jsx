import { useEffect } from 'react';
import { AdminLayout, DataTable, StatCard } from '../../../layouts/AdminLayout.jsx';
import { useAdmin } from '../../../context/AdminContext.jsx';

export default function DepartmentManagement() {
  const { departments, loading, error, fetchDepartments } = useAdmin();

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  if (loading && departments.length === 0) {
    return (
      <AdminLayout title="Department Management" subtitle="Maintain academic departments, faculty allocation and seat strength.">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error && departments.length === 0) {
    return (
      <AdminLayout title="Department Management" subtitle="Maintain academic departments, faculty allocation and seat strength.">
        <div className="rounded-xl border border-error bg-error-container p-md text-error font-bold">
          Failed to load departments: {error}
        </div>
      </AdminLayout>
    );
  }

  const columns = ['Department','Teachers','Students','Batches','Status','Action'];

  return (
    <AdminLayout title="Department Management" subtitle="Maintain academic departments, faculty allocation and seat strength.">
      <div className="mb-lg grid grid-cols-1 gap-gutter md:grid-cols-4">
        <StatCard label="Departments" value={departments.length.toString() || '—'} icon="domain"/>
        <StatCard label="Faculty" value="—" icon="school"/>
        <StatCard label="Students" value="—" icon="groups"/>
        <StatCard label="Avg Integrity" value="—" icon="verified_user"/>
      </div>
      <DataTable
        columns={columns}
        rows={departments}
        renderRow={(r) => (
          <tr key={r.id || r[0]} className="hover:bg-surface-container">
            <td className="px-md py-md font-bold">{r.name || r[0]}</td>
            <td className="px-md py-md">{r.teachers ?? r[1]}</td>
            <td className="px-md py-md">{r.students ?? r[2]}</td>
            <td className="px-md py-md">{r.batches ?? r[3]}</td>
            <td className="px-md py-md">{r.status || r[4]}</td>
            <td className="px-md py-md text-right"><button className="rounded bg-primary px-md py-xs text-sm text-white">Open</button></td>
          </tr>
        )}
      />
    </AdminLayout>
  );
}
