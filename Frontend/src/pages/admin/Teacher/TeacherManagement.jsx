import { useEffect } from 'react';
import { AdminLayout, DataTable, StatCard } from '../../../layouts/AdminLayout.jsx';
import { useAdmin } from '../../../context/AdminContext.jsx';

export default function TeacherManagement() {
  const { teachers, loading, error, fetchTeachers } = useAdmin();

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  if (loading && teachers.length === 0) {
    return (
      <AdminLayout title="Teacher Management" subtitle="Manage faculty accounts, assigned exams, reports and access permissions.">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error && teachers.length === 0) {
    return (
      <AdminLayout title="Teacher Management" subtitle="Manage faculty accounts, assigned exams, reports and access permissions.">
        <div className="rounded-xl border border-error bg-error-container p-md text-error font-bold">
          Failed to load teachers: {error}
        </div>
      </AdminLayout>
    );
  }

  const columns = ['Teacher','Department','Created Exams','Students Covered','Status','Action'];

  return (
    <AdminLayout title="Teacher Management" subtitle="Manage faculty accounts, assigned exams, reports and access permissions.">
      <div className="mb-lg grid grid-cols-1 gap-gutter md:grid-cols-4">
        <StatCard label="Teachers" value={teachers.length.toString() || '—'} icon="school"/>
        <StatCard label="Active Exams" value="—" icon="assignment"/>
        <StatCard label="Reports Pending" value="—" icon="summarize" tone="secondary"/>
        <StatCard label="Access Reviews" value="—" icon="admin_panel_settings"/>
      </div>
      <DataTable
        columns={columns}
        rows={teachers}
        renderRow={(r) => (
          <tr key={r.id || r[0]} className="hover:bg-surface-container">
            <td className="px-md py-md font-bold">{r.name || r[0]}</td>
            <td className="px-md py-md">{r.department || r[1]}</td>
            <td className="px-md py-md">{r.createdExams ?? r[2]}</td>
            <td className="px-md py-md">{r.studentsCovered ?? r[3]}</td>
            <td className="px-md py-md">{r.status || r[4]}</td>
            <td className="px-md py-md text-right"><button className="rounded bg-surface-container-high px-md py-xs text-sm hover:bg-primary hover:text-white">Manage</button></td>
          </tr>
        )}
      />
    </AdminLayout>
  );
}
