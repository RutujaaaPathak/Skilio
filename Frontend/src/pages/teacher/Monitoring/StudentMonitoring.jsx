import { useState } from 'react'
import TeacherShell, { Icon, StatCard } from '../../../components/TeacherShell.jsx'

const students = []
export default function StudentMonitoring({ page, setPage }) {
  const [active, setActive] = useState(null)
  return <TeacherShell page={page} setPage={setPage} title="Student Monitoring">
    <div className="mb-lg"><span className="pill bg-tertiary-fixed text-on-tertiary-container">LIVE EXAM ACTIVE</span><h1 className="text-4xl font-extrabold text-primary mt-sm">Student Monitoring</h1><p className="text-on-surface-variant">Watch candidate feeds, identity confidence, system health, and risk flags.</p></div>
    <div className="grid md:grid-cols-4 gap-gutter mb-lg"><StatCard label="Online" value="—" /><StatCard label="High Risk" value="—" /><StatCard label="Face Verified" value="—" /><StatCard label="Avg Network" value="—" /></div>
    <div className="grid lg:grid-cols-[1fr_360px] gap-gutter"><section className="card p-md"><div className="grid md:grid-cols-3 gap-sm">{students.length === 0 ? <p className="col-span-3 text-center text-on-surface-variant py-xl">No active students in this session.</p> : students.map((s, i) => <button key={s} onClick={() => setActive(s)} className={`relative aspect-video rounded-xl overflow-hidden border-2 ${active === s ? 'border-secondary-container' : 'border-outline-variant'} bg-primary text-white text-left p-sm`}><div className="absolute inset-0 bg-gradient-to-br from-primary-container to-primary" /><div className="relative z-10 h-full flex flex-col justify-between"><div className="flex justify-between"><span className="pill bg-tertiary-fixed text-on-tertiary-container">Stable</span><Icon className="text-white/70">videocam</Icon></div><div><p className="font-bold">{s}</p></div></div></button>)}</div></section><aside className="card p-md"><h2 className="text-xl font-bold text-primary mb-md">Candidate Detail</h2><p className="text-on-surface-variant text-sm">Select a student to view their monitoring details.</p></aside></div>
  </TeacherShell>
}
