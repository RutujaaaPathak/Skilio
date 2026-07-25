import { useState, useCallback, useRef, lazy, Suspense } from 'react'

const TeacherDashboard = lazy(() => import('./Dashboard/TeacherDashboard.jsx'))
const TeacherProfile = lazy(() => import('./Profile/TeacherProfile.jsx'))
const TeacherSettings = lazy(() => import('./Settings/TeacherSettings.jsx'))
const AnswerEvaluation = lazy(() => import('./Evaluation/AnswerEvaluation.jsx'))
const Reports = lazy(() => import('./Evaluation/Reports.jsx'))
const CreateExam = lazy(() => import('./ExamManagement/CreateExam.jsx'))
const ExamScheduling = lazy(() => import('./ExamManagement/ExamScheduling.jsx'))
const AssignStudents = lazy(() => import('./ExamManagement/AssignStudents.jsx'))
const QuestionBankManagement = lazy(() => import('./ExamManagement/QuestionBankManagement.jsx'))
const SyllabusMapping = lazy(() => import('./ExamManagement/SyllabusMapping.jsx'))
const StudentIntelligenceProfileViewer = lazy(() => import('./Intelligence/StudentIntelligenceProfileViewer.jsx'))
const LiveExamControlRoom = lazy(() => import('./Monitoring/LiveExamControlRoom.jsx'))
const StudentMonitoring = lazy(() => import('./Monitoring/StudentMonitoring.jsx'))
const SuspiciousActivityAlerts = lazy(() => import('./Monitoring/SuspiciousActivityAlerts.jsx'))

function LoadingFallback() {
  return <div className="min-h-screen bg-background flex items-center justify-center"><div className="text-primary text-lg font-semibold">Loading...</div></div>
}

export default function TeacherPortal() {
  const [page, setPage] = useState('dashboard')
  const [navCount, setNavCount] = useState(0)
  const pageRef = useRef({})

  const handleSetPage = useCallback((p, ...args) => {
    if (args.length > 0) pageRef.current = { [p]: args[0] }
    setPage(p)
    setNavCount(n => n + 1)
  }, [])

  const props = { page, setPage: handleSetPage, pageRef }
  const pages = {
    dashboard: <TeacherDashboard key={'dash-' + navCount} {...props} />,
    profile: <TeacherProfile key={'prof-' + navCount} {...props} />,
    settings: <TeacherSettings key={'set-' + navCount} {...props} />,
    answerEvaluation: <AnswerEvaluation key={'ans-' + navCount} {...props} />,
    reports: <Reports key={'rep-' + navCount} {...props} />,
    createExam: <CreateExam key={'create-' + navCount} {...props} />,
    scheduling: <ExamScheduling key={'sched-' + navCount} {...props} />,
    assignStudents: <AssignStudents key={'assign-' + navCount} {...props} />,
    questionBank: <QuestionBankManagement key={'qb-' + navCount} {...props} />,
    syllabus: <SyllabusMapping key={'syll-' + navCount} {...props} />,
    studentProfile: <StudentIntelligenceProfileViewer key={'sp-' + navCount} {...props} />,
    liveRoom: <LiveExamControlRoom key={'live-' + navCount} {...props} />,
    monitoring: <StudentMonitoring key={'mon-' + navCount} {...props} />,
    alerts: <SuspiciousActivityAlerts key={'alert-' + navCount} {...props} />,
  }

  return <Suspense fallback={<LoadingFallback />}>{pages[page] || pages.dashboard}</Suspense>
}
