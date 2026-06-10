import { AdminLayout } from '../../../layouts/AdminLayout.jsx';

export default function ExamPolicySettings() {
  return (
    <AdminLayout title="Exam Policy Settings" subtitle="Configure global examination integrity rules and institutional overrides.">
      <div className="grid grid-cols-12 gap-gutter">
        <section className="col-span-12 space-y-md md:col-span-8">
          <p className="text-on-surface-variant">Policy configuration will appear here once server data is available.</p>
        </section>
        <aside className="bento-card col-span-12 p-md md:col-span-4">
          <h3 className="text-xl font-bold">Policy Health</h3>
          <p className="mt-sm text-4xl font-extrabold">—</p>
          <p className="mt-xs text-sm text-on-surface-variant">Policy compliance data pending from server.</p>
        </aside>
      </div>
    </AdminLayout>
  );
}
