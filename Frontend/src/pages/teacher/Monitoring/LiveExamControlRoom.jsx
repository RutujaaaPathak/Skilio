import { useState } from 'react'
import TeacherShell, { Icon, StatCard } from '../../../components/TeacherShell.jsx'

export default function LiveExamControlRoom({ page, setPage }) {
  const [lockdown, setLockdown] = useState(true)
  return <TeacherShell page={page} setPage={setPage} title="Live Exam Control Room">
    <div className="mb-lg flex justify-between items-end"><div><span className="pill bg-tertiary-fixed text-on-tertiary-container">CONTROL ROOM ACTIVE</span><h1 className="text-4xl font-extrabold text-primary mt-sm">Live Exam Control</h1><p className="text-on-surface-variant">Select an active exam to monitor from the scheduling page.</p></div><button onClick={() => setLockdown(!lockdown)} className={`${lockdown ? 'btn-secondary' : 'btn-primary'} px-lg py-sm flex gap-xs`}><Icon>{lockdown ? 'lock' : 'lock_open'}</Icon>{lockdown ? 'Lockdown ON' : 'Lockdown OFF'}</button></div>
    <div className="grid md:grid-cols-5 gap-gutter mb-lg"><StatCard label="Students" value="—" /><StatCard label="Submitted" value="—" /><StatCard label="Flagged" value="—" /><StatCard label="Avg Progress" value="—" /><StatCard label="Time Left" value="—" /></div>
    <div className="bento-grid"><section className="col-span-8 card p-md"><div className="flex justify-between mb-md"><h2 className="text-xl font-bold text-primary">Live Proctoring Grid</h2><button onClick={() => setPage('monitoring')} className="text-secondary font-bold">Open detailed monitoring</button></div><p className="text-on-surface-variant text-sm">No active exam session. Schedule or start an exam to see live proctoring data.</p></section><section className="col-span-4 card p-md"><h2 className="text-xl font-bold text-primary mb-md">Control Actions</h2><p className="text-on-surface-variant text-sm">Controls will be available during an active exam.</p></section><section className="col-span-12 card p-md"><h2 className="text-xl font-bold text-primary mb-md">Live Activity Feed</h2><p className="text-on-surface-variant">Activity feed will appear during an active exam.</p></section></div>
  </TeacherShell>
}
