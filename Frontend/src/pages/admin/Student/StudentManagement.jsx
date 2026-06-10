import { useEffect, useState } from 'react';
import { AdminLayout, DataTable, StatCard } from '../../../layouts/AdminLayout.jsx';
import { useAdmin } from '../../../context/AdminContext.jsx';

export default function StudentManagement() {
  const { students, loading, error, fetchStudents } = useAdmin();
  const [query, setQuery] = useState('');

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const filtered = students.filter(r => {
    const name = r.name || r[0] || '';
    return name.toLowerCase().includes(query.toLowerCase());
  });
  const columns = ['Student','Batch','Avg Score','Integrity','Status','Action'];

  if (loading && students.length === 0) {
    return (
      <AdminLayout title="Student Management" subtitle="Manage student profiles, enrollment, verification and risk status." searchPlaceholder="Search students...">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error && students.length === 0) {
    return (
      <AdminLayout title="Student Management" subtitle="Manage student profiles, enrollment, verification and risk status." searchPlaceholder="Search students...">
        <div className="rounded-xl border border-error bg-error-container p-md text-error font-bold">
          Failed to load students: {error}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Student Management" subtitle="Manage student profiles, enrollment, verification and risk status." searchPlaceholder="Search students...">
      <div className="mb-lg grid grid-cols-1 gap-gutter md:grid-cols-4">
        <StatCard label="Total Students" value={students.length.toString() || '—'} icon="groups"/>
        <StatCard label="Verified IDs" value="—" icon="badge"/>
        <StatCard label="Flagged" value="—" icon="flag" tone="secondary"/>
        <StatCard label="Suspended" value="—" icon="block" tone="error"/>
      </div>
      <div className="mb-md">
        <input value={query} onChange={e => setQuery(e.target.value)} className="w-full rounded-xl border border-outline-variant bg-white p-md outline-none focus:border-secondary" placeholder="Filter student list..."/>
      </div>
      <DataTable
        columns={columns}
        rows={filtered}
        renderRow={(r) => (
          <tr key={r.id || r[0]} className="hover:bg-surface-container">
            <td className="px-md py-md font-bold">{r.name || r[0]}</td>
            <td className="px-md py-md">{r.batch || r[1]}</td>
            <td className="px-md py-md">{r.avgScore ?? r[2]}</td>
            <td className="px-md py-md">{r.integrity || r[3]}</td>
            <td className="px-md py-md">
              <span className={`rounded-full px-sm py-xs text-xs font-bold ${(r.status || r[4]) === 'Active' || (r.status || r[4]) === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-error-container text-error'}`}>
                {r.status || r[4]}
              </span>
            </td>
            <td className="px-md py-md text-right"><button className="rounded bg-primary px-md py-xs text-sm text-white">Profile</button></td>
          </tr>
        )}
      />
    </AdminLayout>
  );
}
