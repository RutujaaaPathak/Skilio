import { useState, useEffect, useCallback } from 'react'
import TeacherShell, { Icon } from '../../../components/TeacherShell.jsx'
import { useAuth } from '../../../hooks/useAuth.js'
import { examService } from '../../../services/examService.js'
import { studentService } from '../../../services/studentService.js'

export default function AssignStudents({ page, setPage, pageRef }) {
  const { user } = useAuth()
  const [exams, setExams] = useState([])
  const [selectedExamId, setSelectedExamId] = useState(() => pageRef?.current?.assignStudents ?? null)
  const [students, setStudents] = useState([])
  const [assigned, setAssigned] = useState(new Set())
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [filters, setFilters] = useState({ batch: '', year: '', branch: user?.branch || '', division: '' })

  const fetchExams = useCallback(async () => {
    try {
      const data = await examService.list()
      setExams(data.filter(e => e.status !== 'draft' && e.status !== 'completed'))
    } catch { setExams([]) }
  }, [])

  const fetchStudents = useCallback(async () => {
    try {
      const data = await studentService.list()
      console.log('Fetched students:', data?.length ?? 'no data', data)
      if (data && !Array.isArray(data)) {
        const extracted = data.students || data.data || data.users || Object.values(data).find(v => Array.isArray(v))
        if (extracted) { setStudents(extracted); return }
      }
      setStudents(Array.isArray(data) ? data : [])
    } catch (err) { console.error('Failed to fetch students:', err); setStudents([]) }
  }, [])

  const fetchAssigned = useCallback(async (examId) => {
    if (!examId) { setAssigned(new Set()); return }
    try {
      const data = await examService.getAssignedStudents(examId)
      setAssigned(new Set(data.map(a => a.student_id)))
    } catch { setAssigned(new Set()) }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchExams(), fetchStudents()]).finally(() => setLoading(false))
  }, [fetchExams, fetchStudents])

  useEffect(() => {
    fetchAssigned(selectedExamId)
    setSelected(new Set())
  }, [selectedExamId, fetchAssigned])

  useEffect(() => {
    if (user?.branch && !filters.branch) {
      setFilters(prev => ({ ...prev, branch: user.branch }))
    }
  }, [user?.branch])

  const filtered = students.filter(s => {
    if (filters.batch && s.batch !== filters.batch) return false
    if (filters.year && s.year !== filters.year) return false
    if (filters.branch && s.branch !== filters.branch) return false
    if (filters.division && s.division !== filters.division) return false
    return true
  })

  const toggleStudent = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleAssign = async () => {
    if (!selectedExamId || selected.size === 0) return
    setAssigning(true)
    try {
      await examService.assignStudents(selectedExamId, [...selected])
      await fetchAssigned(selectedExamId)
      setSelected(new Set())
    } catch (e) { alert('Failed to assign: ' + e.message) }
    finally { setAssigning(false) }
  }

  const handleRemove = async (studentId) => {
    if (!selectedExamId) return
    try {
      const assignment = await examService.getAssignedStudents(selectedExamId)
      const a = assignment.find(a => a.student_id === studentId)
      if (!a) return
      await examService.removeAssignment(a.id)
      await fetchAssigned(selectedExamId)
    } catch (e) { alert('Failed to remove: ' + e.message) }
  }

  const distinct = (field) => [...new Set(students.map(s => s[field]).filter(Boolean))].sort()

  const selectedExam = exams.find(e => e.id === selectedExamId)

  return (
    <TeacherShell page={page} setPage={setPage} title="Assign Students">
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h1 className="text-4xl font-extrabold text-primary">Assign Students</h1>
          <p className="text-on-surface-variant">Select an exam and assign students to it.</p>
        </div>
      </div>

      <div className="bento-grid">
        {/* Exam selector */}
        <section className="col-span-4 card p-md">
          <h2 className="text-xl font-bold text-primary mb-md">Select Exam</h2>
          {loading ? (
            <p className="text-on-surface-variant text-sm">Loading...</p>
          ) : exams.length === 0 ? (
            <p className="text-on-surface-variant text-sm">No schedulable exams. Create one first.</p>
          ) : (
            <div className="space-y-xs max-h-[500px] overflow-y-auto">
              {exams.map(e => (
                <button
                  key={e.id}
                  onClick={() => setSelectedExamId(e.id)}
                  className={`w-full text-left p-sm rounded-lg border transition-colors ${selectedExamId === e.id ? 'border-secondary-container bg-secondary-container/10 ring-2 ring-secondary-container' : 'border-outline-variant hover:bg-surface-container-low'}`}
                >
                  <p className="font-bold text-sm text-primary">{e.title}</p>
                  <p className="text-xs text-on-surface-variant">{e.subject} • {new Date(e.start_time).toLocaleString()}</p>
                  <span className={`text-[10px] font-bold ${e.status === 'active' ? 'text-error' : 'text-secondary'}`}>{e.status}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Student list */}
        <section className="col-span-8 card p-md">
          {!selectedExamId ? (
            <div className="flex flex-col items-center justify-center py-xxl text-on-surface-variant">
              <Icon className="text-[48px] mb-md">group</Icon>
              <p>Select an exam to assign students</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-md">
                <h2 className="text-xl font-bold text-primary">
                  {selectedExam.title}
                </h2>
                <button
                  onClick={handleAssign}
                  disabled={selected.size === 0 || assigning}
                  className="btn-primary px-md py-sm flex gap-xs items-center disabled:opacity-50"
                >
                  <Icon>group_add</Icon>
                  {assigning ? 'Assigning...' : `Assign Selected (${selected.size})`}
                </button>
              </div>

              {/* Filters */}
              <div className="flex gap-sm mb-md flex-wrap items-center">
                {['batch', 'year', 'branch', 'division'].map(f => (
                  <select
                    key={f}
                    value={filters[f]}
                    onChange={e => setFilters(prev => ({ ...prev, [f]: e.target.value }))}
                    className="bg-surface-container-low border border-outline-variant rounded-lg px-sm py-xs text-sm capitalize"
                  >
                    <option value="">All {f}s</option>
                    {distinct(f).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                ))}
                {user?.branch && filters.branch === user.branch && (
                  <span className="text-[10px] bg-secondary-container text-secondary px-sm py-0.5 rounded-full font-bold">My Branch</span>
                )}
                {user?.college && (
                  <span className="text-[10px] bg-surface-container-high text-on-surface-variant px-sm py-0.5 rounded-full">{user.college}</span>
                )}
                <span className="text-xs text-on-surface-variant self-center ml-auto">
                  {filtered.length} student{filtered.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Table */}
              <div className="overflow-y-auto max-h-[500px] border border-outline-variant rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-surface-container-high sticky top-0">
                    <tr>
                      <th className="text-left p-sm w-10">
                        <input
                          type="checkbox"
                          checked={filtered.length > 0 && filtered.every(s => assigned.has(s.id) || selected.has(s.id))}
                          onChange={() => {
                            const unassignable = filtered.filter(s => !assigned.has(s.id))
                            const allSelected = unassignable.every(s => selected.has(s.id))
                            const next = new Set(selected)
                            unassignable.forEach(s => {
                              if (allSelected) next.delete(s.id); else next.add(s.id)
                            })
                            setSelected(next)
                          }}
                        />
                      </th>
                      <th className="text-left p-sm text-on-surface-variant font-bold">Name</th>
                      <th className="text-left p-sm text-on-surface-variant font-bold hidden md:table-cell">Email</th>
                      <th className="text-left p-sm text-on-surface-variant font-bold hidden lg:table-cell">Batch</th>
                      <th className="text-left p-sm text-on-surface-variant font-bold hidden lg:table-cell">Branch</th>
                      <th className="text-center p-sm text-on-surface-variant font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {filtered.map(s => {
                      const isAssigned = assigned.has(s.id)
                      const isSelected = selected.has(s.id)
                      return (
                        <tr key={s.id} className={`hover:bg-surface-container-low transition-colors ${isAssigned ? 'opacity-60' : ''}`}>
                          <td className="p-sm">
                            <input
                              type="checkbox"
                              checked={isAssigned || isSelected}
                              disabled={isAssigned}
                              onChange={() => toggleStudent(s.id)}
                            />
                          </td>
                          <td className="p-sm font-bold text-primary">{s.name}</td>
                          <td className="p-sm text-on-surface-variant hidden md:table-cell">{s.email}</td>
                          <td className="p-sm text-on-surface-variant hidden lg:table-cell">{s.batch || '—'}</td>
                          <td className="p-sm text-on-surface-variant hidden lg:table-cell">{s.branch || '—'}</td>
                          <td className="p-sm text-center">
                            {isAssigned ? (
                              <button onClick={() => handleRemove(s.id)} className="text-error text-xs font-bold flex items-center gap-xs justify-center">
                                <Icon className="text-sm">close</Icon> Remove
                              </button>
                            ) : (
                              <span className="text-on-surface-variant text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={6} className="text-center p-lg text-on-surface-variant">No students match filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </TeacherShell>
  )
}
