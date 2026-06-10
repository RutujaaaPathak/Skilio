import { useState } from 'react'
import TeacherShell, { Icon } from '../../../components/TeacherShell.jsx'

export default function SyllabusMapping({ page, setPage }) {
  const topics = []
  const [selected, setSelected] = useState([])
  return <TeacherShell page={page} setPage={setPage} title="Syllabus Mapping">
    <div className="mb-lg"><h1 className="text-4xl font-extrabold text-primary">Syllabus Mapping</h1><p className="text-on-surface-variant">Map questions and exams to curriculum outcomes and topic coverage.</p></div>
    <div className="bento-grid"><section className="col-span-4 card p-md"><h2 className="text-xl font-bold text-primary mb-md">Curriculum Tree</h2>{topics.length === 0 ? <p className="text-on-surface-variant text-sm">No topics mapped yet.</p> : topics.map(t => <button key={t} onClick={() => setSelected(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t])} className={`w-full p-sm mb-sm rounded-lg text-left border ${selected.includes(t) ? 'border-secondary-container bg-secondary-container/10' : 'border-outline-variant hover:bg-surface-container-low'}`}><div className="flex justify-between"><b>{t}</b>{selected.includes(t) && <Icon className="text-secondary">check_circle</Icon>}</div><p className="text-xs text-on-surface-variant">CO-{topics.indexOf(t) + 1}</p></button>)}</section><section className="col-span-8 card p-md"><h2 className="text-xl font-bold text-primary mb-md">Coverage Matrix</h2><p className="text-on-surface-variant text-sm">Coverage data will appear once topics are mapped.</p></section><section className="col-span-12 card p-md"><h2 className="text-xl font-bold text-primary mb-md">AI Recommendation</h2><p className="text-on-surface-variant">Recommendations will appear once syllabus mapping data is available.</p></section></div>
  </TeacherShell>
}
