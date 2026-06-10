import { useState } from 'react'
import TeacherShell, { Icon, StatCard } from '../../../components/TeacherShell.jsx'

export default function StudentIntelligenceProfileViewer({ page, setPage }) {
  const [student, setStudent] = useState('')
  const skills = []
  return <TeacherShell page={page} setPage={setPage} title="Student Intelligence Profile" search>
    <div className="flex justify-between items-end mb-lg"><div><h1 className="text-4xl font-extrabold text-primary">Intelligence Profile Viewer</h1><p className="text-on-surface-variant">Understand student strengths, weaknesses, behavior patterns, and learning gaps.</p></div><select value={student} onChange={e => setStudent(e.target.value)} className="input max-w-[14rem]"><option value="">Select a student</option></select></div>
    <div className="grid md:grid-cols-4 gap-gutter mb-lg"><StatCard label="Overall Score" value="—" /><StatCard label="Consistency" value="—" /><StatCard label="Risk Level" value="—" /><StatCard label="Growth" value="—" /></div>
    <div className="bento-grid"><section className="col-span-5 card p-lg bg-primary-container text-white"><div className="flex items-center gap-md mb-lg"><div className="w-20 h-20 rounded-full bg-secondary-container grid place-items-center text-primary text-2xl font-bold">—</div><div><h2 className="text-2xl font-bold">{student || 'No student selected'}</h2><p className="text-primary-fixed-dim">Select a student to view their profile</p></div></div>{skills.length === 0 ? <p className="text-sm opacity-70">Skill data not available.</p> : skills.map(([s, v]) => <div className="mb-md" key={s}><div className="flex justify-between text-sm mb-xs"><span>{s}</span><b>{v}%</b></div><div className="h-2 bg-white/10 rounded"><div className="h-full bg-secondary-container rounded" style={{ width: v + '%' }} /></div></div>)}</section><section className="col-span-7 card p-md"><h2 className="text-xl font-bold text-primary mb-md">AI Learning Insights</h2><p className="text-on-surface-variant">Insights will appear once student assessment data is available.</p></section><section className="col-span-12 card p-md"><h2 className="text-xl font-bold text-primary mb-md">Recent Exam Timeline</h2><p className="text-on-surface-variant">Exam history will appear here once data is available.</p></section></div>
  </TeacherShell>
}
