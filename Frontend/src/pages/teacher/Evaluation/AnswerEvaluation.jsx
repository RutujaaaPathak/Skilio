import { useState, useEffect } from 'react'
import TeacherShell, { Icon } from '../../../components/TeacherShell.jsx'
import { api } from '../../../services/api.js'

export default function AnswerEvaluation({ page, setPage }) {
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [marks, setMarks] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const examId = new URLSearchParams(window.location.search).get('examId') || ''

  useEffect(() => {
    if (!examId) return
    setLoading(true)
    api.get(`/teacher/evaluation/gradebook/${examId}`)
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.students || []
        setStudents(list)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [examId])

  const handleStudentSelect = (studentId) => {
    setSelectedStudent(studentId)
    const student = students.find((s) => String(s.id) === studentId)
    if (student) {
      setMarks(student.marks != null ? String(student.marks) : '')
      setFeedback(student.feedback || '')
    } else {
      setMarks('')
      setFeedback('')
    }
  }

  const handleSaveMarks = async () => {
    if (!selectedStudent || !examId) return
    setSaving(true)
    try {
      await api.post(`/teacher/evaluation/gradebook/${examId}/students/${selectedStudent}`, {
        marks: marks ? Number(marks) : null,
        feedback,
      })
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  return <TeacherShell page={page} setPage={setPage} title="Answer Evaluation">
    <div className="mb-lg flex justify-between items-end">
      <div>
        <span className="pill bg-tertiary-container text-tertiary-fixed mb-base inline-block">Exam Name</span>
        <h1 className="text-4xl font-extrabold text-primary">Evaluation</h1>
        <p className="text-on-surface-variant">Select a student submission to begin evaluation.</p>
      </div>
      <div className="flex items-center gap-sm">
        <select
          value={String(selectedStudent || '')}
          onChange={(e) => handleStudentSelect(e.target.value)}
          className="px-md py-sm bg-white border border-outline-variant rounded-xl min-w-56 appearance-auto text-sm"
        >
          <option value="">Select a student</option>
          {students.map((s) => (
            <option key={s.id} value={String(s.id)}>{s.name || `Student #${s.id}`}</option>
          ))}
        </select>
      </div>
    </div>

    {loading ? (
      <div className="bento-grid"><div className="col-span-12 card p-md flex items-center justify-center py-xl"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span className="ml-sm text-on-surface-variant">Loading students...</span></div></div>
    ) : !examId ? (
      <div className="bento-grid"><div className="col-span-12 card p-md"><h2 className="text-xl font-bold text-primary mb-md">Evaluation Panel</h2><p className="text-on-surface-variant">No exam selected. Navigate to the Reports page to pick a student answer for evaluation.</p><button onClick={() => setPage('reports')} className="btn-secondary px-md py-sm mt-md">Go to Reports</button></div></div>
    ) : selectedStudent ? (
      <div className="bento-grid">
        <div className="col-span-8 card p-md">
          <h2 className="text-xl font-bold text-primary mb-md">Student Submission</h2>
          <p className="text-on-surface-variant">Student responses will appear here.</p>
        </div>
        <div className="col-span-4 card p-md">
          <h2 className="text-xl font-bold text-primary mb-md">Evaluation</h2>
          <div className="space-y-md">
            <div>
              <label className="text-label-md text-on-surface-variant block mb-xs">Marks</label>
              <input
                type="number"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                className="w-full px-md py-sm bg-white border border-outline-variant rounded-xl text-sm"
                placeholder="Enter marks"
              />
            </div>
            <div>
              <label className="text-label-md text-on-surface-variant block mb-xs">Feedback</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full px-md py-sm bg-white border border-outline-variant rounded-xl text-sm min-h-[100px]"
                placeholder="Enter feedback"
              />
            </div>
            <button onClick={handleSaveMarks} disabled={saving} className="btn-primary w-full py-sm px-md rounded-xl font-bold flex items-center justify-center gap-xs">
              {saving ? 'Saving...' : 'Save Evaluation'} <Icon name="save" />
            </button>
          </div>
        </div>
      </div>
    ) : (
      <div className="bento-grid"><div className="col-span-12 card p-md"><h2 className="text-xl font-bold text-primary mb-md">Evaluation Panel</h2><p className="text-on-surface-variant">No submission selected. Select a student from the dropdown to begin evaluation.</p></div></div>
    )}
  </TeacherShell>
}
