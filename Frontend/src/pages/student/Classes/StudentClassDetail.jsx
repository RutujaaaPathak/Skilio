import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import StudentLayout from '../../../components/StudentLayout.jsx'
import Icon from '../../../components/Icon.jsx'
import { classService } from '../../../services/classService.js'

export default function StudentClassDetail() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [cls, setCls] = useState(null)
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [clsData, examsData] = await Promise.all([
        classService.getMyClassDetail(parseInt(classId)),
        classService.getMyClassExams(parseInt(classId)),
      ])
      setCls(clsData)
      setExams(Array.isArray(examsData) ? examsData : [])
    } catch {
      setCls(null)
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return <StudentLayout title="Loading...">
      <div className="p-gutter max-w-container-max mx-auto text-center py-xl text-on-surface-variant">Loading class details...</div>
    </StudentLayout>
  }

  if (!cls) {
    return <StudentLayout title="Class Not Found">
      <div className="p-gutter max-w-container-max mx-auto text-center py-xl">
        <Icon name="error_outline" className="text-on-surface-variant text-[48px] mb-md" />
        <h3 className="text-headline-sm text-primary font-bold mb-xs">Class Not Found</h3>
        <p className="text-on-surface-variant mb-lg">This class may have been removed or you are no longer a member.</p>
        <Link to="/student/classes" className="inline-flex h-11 px-lg items-center bg-primary text-on-primary rounded-lg font-bold hover:opacity-90">Back to Classes</Link>
      </div>
    </StudentLayout>
  }

  return (
    <StudentLayout title={cls.name}>
      <div className="p-gutter max-w-container-max mx-auto">
        {/* Header */}
        <div className="bg-surface border border-outline-variant rounded-xl p-md mb-lg">
          <h2 className="text-headline-md font-bold text-primary mb-xs">{cls.name}</h2>
          <p className="text-sm text-on-surface-variant mb-sm">{cls.subject}</p>
          {(cls.semester || cls.academic_year) && (
            <p className="text-xs text-on-surface-variant mb-sm">{cls.semester && `Semester ${cls.semester}`}{cls.semester && cls.academic_year ? ' • ' : ''}{cls.academic_year || ''}</p>
          )}
          <div className="flex items-center gap-lg text-sm text-on-surface-variant">
            <span className="flex items-center gap-xs"><Icon name="person" className="text-sm" /> Teacher: {cls.teacher_name}</span>
            <span className="flex items-center gap-xs"><Icon name="people" className="text-sm" /> {cls.student_count} Students</span>
          </div>
        </div>

        {/* Assigned Exams */}
        <h3 className="text-headline-sm font-bold text-primary mb-md">Assigned Exams ({exams.length})</h3>
        {exams.length === 0 ? (
          <div className="bg-surface border border-dashed border-outline-variant rounded-xl p-xl text-center">
            <Icon name="assignment" className="text-on-surface-variant text-[36px] mb-sm" />
            <p className="text-sm text-on-surface-variant">No exams have been assigned to this class yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-md">
            {exams.map(ex => {
              const isAssigned = ex.assignment_status === 'assigned'
              const isStarted = ex.assignment_status === 'started'
              const isSubmitted = ex.assignment_status === 'submitted' || ex.assignment_status === 'reviewed'
              const isActive = ex.status === 'active'
              const canStart = (isAssigned || isStarted) && isActive
              return (
                <div key={ex.exam_id} className="bg-surface border border-outline-variant rounded-xl p-md">
                  <div className="flex items-start justify-between mb-sm">
                    <h4 className="text-base font-bold text-primary">{ex.exam_title}</h4>
                    <span className={`pill text-xs font-bold ${
                      isSubmitted ? 'bg-success-container text-success' :
                      isStarted ? 'bg-secondary-container text-secondary' :
                      isAssigned && isActive ? 'bg-error-container text-error' :
                      'bg-surface-container-high text-on-surface-variant'
                    }`}>
                      {isSubmitted ? 'Completed' :
                       isStarted ? 'In Progress' :
                       isAssigned && isActive ? 'Available' :
                       'Scheduled'}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mb-xs">{ex.subject}</p>
                  <p className="text-xs text-on-surface-variant">{new Date(ex.start_time).toLocaleString()} • {ex.duration_minutes} min • {ex.total_marks} marks</p>
                  <div className="mt-md">
                    {canStart && (
                      <button
                        onClick={() => {
                          localStorage.setItem('active_exam_id', ex.exam_id)
                          localStorage.removeItem('session_token')
                          localStorage.removeItem('offline_package')
                          navigate('/student/exams/instructions')
                        }}
                        className="inline-flex h-9 px-md items-center bg-primary text-on-primary rounded-lg text-label-sm font-bold hover:opacity-90"
                      >
                        {isStarted ? 'Resume Exam' : 'Start Exam'}
                      </button>
                    )}
                    {isSubmitted && (
                      <Link to={`/student/exams/result?exam_id=${ex.exam_id}`} className="inline-flex h-9 px-md items-center bg-surface-container-high text-on-surface-variant rounded-lg text-label-sm font-bold hover:bg-surface-container-higher">
                        View Result
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-lg">
          <Link to="/student/classes" className="inline-flex h-9 px-md items-center text-sm font-bold text-secondary hover:underline gap-xs">
            <Icon name="arrow_back" className="text-sm" /> Back to Classes
          </Link>
        </div>
      </div>
    </StudentLayout>
  )
}
