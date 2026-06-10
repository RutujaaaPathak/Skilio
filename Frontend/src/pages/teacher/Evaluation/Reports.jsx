import TeacherShell, { Icon, StatCard } from '../../../components/TeacherShell.jsx'

export default function Reports({ page, setPage }) {
  return <TeacherShell page={page} setPage={setPage} title="Reports & Analytics">
    <div className="mb-lg"><span className="pill bg-secondary-fixed text-secondary">Batch Reports</span><h1 className="text-4xl font-extrabold text-primary mt-sm">Performance Analytics</h1><p className="text-on-surface-variant">Track batch outcomes, exam health, and AI-evaluated performance trends.</p></div>
    <div className="grid md:grid-cols-4 gap-gutter mb-lg"><StatCard label="Average Score" value="—" /><StatCard label="Pass Rate" value="—" /><StatCard label="At Risk Students" value="—" /><StatCard label="Integrity Score" value="—" /></div>
    <div className="bento-grid"><section className="col-span-8 card p-md"><h2 className="text-xl font-bold text-primary mb-md">Subject Performance</h2><p className="text-on-surface-variant text-sm">Performance data will appear once exams are evaluated.</p></section><section className="col-span-4 card p-md"><h2 className="text-xl font-bold text-primary mb-md">Export Reports</h2><p className="text-on-surface-variant text-sm">Reports available after evaluation.</p></section><section className="col-span-12 card overflow-hidden"><table className="w-full text-left"><thead><tr className="bg-surface-container-low"><th className="table-th">Student</th><th className="table-th">Score</th><th className="table-th">Rank</th><th className="table-th">Risk</th><th className="table-th">Action</th></tr></thead><tbody><tr><td colSpan={5} className="table-td text-center text-on-surface-variant py-xl">No student data available.</td></tr></tbody></table></section></div>
  </TeacherShell>
}
