import { useState } from 'react'
import TeacherShell, { Icon } from '../../../components/TeacherShell.jsx'

export default function AnswerEvaluation({ page, setPage }) {
  const [marks, setMarks] = useState(0)
  return <TeacherShell page={page} setPage={setPage} title="Answer Evaluation">
    <div className="mb-lg flex justify-between items-end"><div><span className="pill bg-tertiary-container text-tertiary-fixed mb-base inline-block">Exam Name</span><h1 className="text-4xl font-extrabold text-primary">Evaluation</h1><p className="text-on-surface-variant">Select a student submission to begin evaluation.</p></div></div>
    <div className="bento-grid"><div className="col-span-12 card p-md"><h2 className="text-xl font-bold text-primary mb-md">Evaluation Panel</h2><p className="text-on-surface-variant">No submission selected. Navigate to the Reports page to pick a student answer for evaluation.</p><button onClick={() => setPage('reports')} className="btn-secondary px-md py-sm mt-md">Go to Reports</button></div></div>
  </TeacherShell>
}
