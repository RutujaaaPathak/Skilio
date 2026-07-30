import { useState, useEffect, useCallback } from 'react'
import TeacherShell, { Icon } from '../../../components/TeacherShell.jsx'
import { classService } from '../../../services/classService.js'
import { examService } from '../../../services/examService.js'

export default function ManageClass({ page, setPage, pageRef }) {
  const classId = pageRef?.current?.manageClass
  const [cls, setCls] = useState(null)
  const [members, setMembers] = useState([])
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [search, setSearch] = useState('')
  const [removing, setRemoving] = useState(null)
  const [regenerating, setRegenerating] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [selectedExamId, setSelectedExamId] = useState('')
  const [teacherExams, setTeacherExams] = useState([])

  const fetchData = useCallback(async () => {
    if (!classId) return
    setLoading(true)
    try {
      const [clsData, membersData, examsData] = await Promise.all([
        classService.getClassDetail(classId),
        classService.getClassMembers(classId),
        classService.getClassExams(classId),
      ])
      setCls(clsData)
      setMembers(Array.isArray(membersData) ? membersData : [])
      setExams(Array.isArray(examsData) ? examsData : [])
    } catch {
      setCls(null)
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (tab === 'exams') {
      examService.list().then(data => {
        setTeacherExams(Array.isArray(data) ? data : [])
      }).catch(() => setTeacherExams([]))
    }
  }, [tab])

  const handleRemove = async (studentId, studentName) => {
    if (!window.confirm(`Remove ${studentName} from ${cls?.name}?\n\nThis will remove the student's membership from this class.`)) return
    setRemoving(studentId)
    try {
      await classService.removeStudent(classId, studentId)
      await fetchData()
    } catch (e) {
      alert('Failed to remove student: ' + e.message)
    } finally {
      setRemoving(null)
    }
  }

  const handleRegenerate = async () => {
    if (!window.confirm('Regenerate Class Code?\n\nThe old code will stop working for new students. Existing students will remain in the class.')) return
    setRegenerating(true)
    try {
      const result = await classService.regenerateCode(classId)
      setCls(prev => ({ ...prev, code: result.code }))
    } catch (e) {
      alert('Failed to regenerate code: ' + e.message)
    } finally {
      setRegenerating(false)
    }
  }

  const handleAssignExam = async () => {
    if (!selectedExamId) return
    setAssigning(true)
    try {
      await classService.assignExamToClass(classId, parseInt(selectedExamId))
      setSelectedExamId('')
      await fetchData()
    } catch (e) {
      alert('Failed to assign exam: ' + e.message)
    } finally {
      setAssigning(false)
    }
  }

  const copyCode = () => { if (cls) navigator.clipboard.writeText(cls.code) }

  const filteredMembers = members.filter(m =>
    !search || m.student_name.toLowerCase().includes(search.toLowerCase()) || m.student_email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <TeacherShell page={page} setPage={setPage} title="Loading..."><div className="text-center py-xl text-on-surface-variant">Loading class...</div></TeacherShell>
  }

  if (!cls) {
    return <TeacherShell page={page} setPage={setPage} title="Class Not Found">
      <div className="text-center py-xl text-on-surface-variant">Class not found.</div>
    </TeacherShell>
  }

  const TabButton = ({ id, label, icon }) => (
    <button onClick={() => setTab(id)} className={`flex items-center gap-xs px-md py-sm rounded-lg text-sm font-bold transition-colors ${tab === id ? 'bg-secondary-container text-secondary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
      <Icon className="text-sm">{icon}</Icon>{label}
    </button>
  )

  return (
    <TeacherShell page={page} setPage={setPage} title={cls.name}>
      {/* Header */}
      <div className="card p-md mb-lg">
        <div className="flex items-start justify-between flex-wrap gap-md">
          <div>
            <h1 className="text-3xl font-extrabold text-primary mb-xs">{cls.name}</h1>
            <p className="text-sm text-on-surface-variant">{cls.subject}{cls.semester ? ` • Semester ${cls.semester}` : ''}{cls.academic_year ? ` • ${cls.academic_year}` : ''}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-xs">Class Code</p>
            <p className="text-xl font-extrabold text-primary tracking-wider mb-xs">{cls.code}</p>
            <div className="flex gap-sm">
              <button onClick={copyCode} className="px-md py-xs border border-outline-variant rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container-high flex items-center gap-xs"><Icon className="text-xs">content_copy</Icon> Copy</button>
              <button onClick={handleRegenerate} disabled={regenerating} className="px-md py-xs border border-outline-variant rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50"><Icon className="text-xs">refresh</Icon> {regenerating ? '...' : 'Regenerate'}</button>
            </div>
          </div>
        </div>
        <div className="flex gap-lg mt-md text-sm">
          <span className="flex items-center gap-xs text-on-surface-variant"><Icon className="text-sm">people</Icon> {cls.student_count} Students</span>
          <span className="flex items-center gap-xs text-on-surface-variant"><Icon className="text-sm">assignment</Icon> {cls.exam_count} Exams</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-sm mb-lg flex-wrap">
        <TabButton id="overview" label="Overview" icon="dashboard" />
        <TabButton id="students" label="Students" icon="people" />
        <TabButton id="exams" label="Exams" icon="assignment" />
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="grid md:grid-cols-3 gap-md">
          <div className="card p-md text-center">
            <Icon className="text-3xl text-primary mb-sm">people</Icon>
            <h3 className="text-3xl font-extrabold text-primary">{cls.student_count}</h3>
            <p className="text-sm text-on-surface-variant">Students</p>
          </div>
          <div className="card p-md text-center">
            <Icon className="text-3xl text-primary mb-sm">assignment</Icon>
            <h3 className="text-3xl font-extrabold text-primary">{cls.exam_count}</h3>
            <p className="text-sm text-on-surface-variant">Assigned Exams</p>
          </div>
          <div className="card p-md text-center">
            <div className="bg-surface-container-low rounded-xl p-md inline-flex items-center gap-md mb-sm">
              <p className="text-lg font-extrabold text-primary tracking-wider">{cls.code}</p>
              <button onClick={copyCode} className="text-secondary hover:text-secondary/80"><Icon className="text-sm">content_copy</Icon></button>
            </div>
            <p className="text-sm text-on-surface-variant">Class Code</p>
          </div>
        </div>
      )}

      {/* Students Tab */}
      {tab === 'students' && (
        <div className="card p-md">
          <div className="flex items-center justify-between mb-md flex-wrap gap-sm">
            <h3 className="text-lg font-bold text-primary">Students ({filteredMembers.length})</h3>
            <div className="relative w-72">
              <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-outline">search</Icon>
              <input type="text" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-xl h-9 text-sm" />
            </div>
          </div>
          {filteredMembers.length === 0 ? (
            <div className="text-center py-lg text-on-surface-variant text-sm">
              {search ? 'No students match your search.' : 'No students have joined this class yet. Share the class code to invite students.'}
            </div>
          ) : (
            <div className="overflow-x-auto border border-outline-variant rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-high">
                  <tr>
                    <th className="text-left p-sm text-on-surface-variant font-bold">Student</th>
                    <th className="text-left p-sm text-on-surface-variant font-bold hidden md:table-cell">Email</th>
                    <th className="text-left p-sm text-on-surface-variant font-bold hidden lg:table-cell">Joined</th>
                    <th className="text-center p-sm text-on-surface-variant font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {filteredMembers.map(m => (
                    <tr key={m.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="p-sm font-bold text-primary">{m.student_name}</td>
                      <td className="p-sm text-on-surface-variant hidden md:table-cell">{m.student_email}</td>
                      <td className="p-sm text-on-surface-variant hidden lg:table-cell">{new Date(m.joined_at).toLocaleDateString()}</td>
                      <td className="p-sm text-center">
                        <button onClick={() => handleRemove(m.student_id, m.student_name)} disabled={removing === m.student_id} className="text-error text-xs font-bold flex items-center gap-xs justify-center disabled:opacity-50">
                          <Icon className="text-sm">remove_circle</Icon> {removing === m.student_id ? '...' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Exams Tab */}
      {tab === 'exams' && (
        <div className="space-y-md">
          <div className="card p-md">
            <h3 className="text-lg font-bold text-primary mb-md">Assign Exam to Class</h3>
            <div className="flex gap-sm items-end">
              <div className="flex-1">
                <label className="block text-xs font-bold text-on-surface-variant mb-xs">Select Exam</label>
                <select className="input" value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
                  <option value="">Choose an exam...</option>
                  {teacherExams.filter(e => e.status !== 'draft' && e.status !== 'completed' && e.status !== 'cancelled').map(e => (
                    <option key={e.id} value={e.id}>{e.title} ({e.status})</option>
                  ))}
                </select>
              </div>
              <button onClick={handleAssignExam} disabled={!selectedExamId || assigning} className="btn-primary px-lg py-sm disabled:opacity-50">
                {assigning ? 'Assigning...' : 'Assign to Class'}
              </button>
            </div>
          </div>

          <div className="card p-md">
            <h3 className="text-lg font-bold text-primary mb-md">Assigned Exams ({exams.length})</h3>
            {exams.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No exams assigned to this class yet.</p>
            ) : (
              <div className="space-y-sm">
                {exams.map(ex => (
                  <div key={ex.exam_id} className="border border-outline-variant rounded-lg p-md flex items-center justify-between flex-wrap gap-sm">
                    <div>
                      <p className="font-bold text-primary text-sm">{ex.exam_title}</p>
                      <p className="text-xs text-on-surface-variant">{ex.subject} • {ex.status}</p>
                    </div>
                    <div className="flex gap-md text-xs text-on-surface-variant">
                      <span className="font-bold text-success">✓ {ex.completed}</span>
                      <span className="font-bold text-secondary">⟳ {ex.in_progress}</span>
                      <span className="font-bold text-on-surface-variant">○ {ex.not_started}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </TeacherShell>
  )
}
