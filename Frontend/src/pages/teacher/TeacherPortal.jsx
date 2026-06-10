import { useState, useCallback, useRef } from 'react'
import TeacherDashboard from './Dashboard/TeacherDashboard.jsx'
import AnswerEvaluation from './Evaluation/AnswerEvaluation.jsx'
import Reports from './Evaluation/Reports.jsx'
import CreateExam from './ExamManagement/CreateExam.jsx'
import ExamScheduling from './ExamManagement/ExamScheduling.jsx'
import AssignStudents from './ExamManagement/AssignStudents.jsx'
import QuestionBankManagement from './ExamManagement/QuestionBankManagement.jsx'
import SyllabusMapping from './ExamManagement/SyllabusMapping.jsx'
import StudentIntelligenceProfileViewer from './Intelligence/StudentIntelligenceProfileViewer.jsx'
import LiveExamControlRoom from './Monitoring/LiveExamControlRoom.jsx'
import StudentMonitoring from './Monitoring/StudentMonitoring.jsx'
import SuspiciousActivityAlerts from './Monitoring/SuspiciousActivityAlerts.jsx'

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
    answerEvaluation: <AnswerEvaluation key={'ans-' + navCount} {...props} />,
    reports: <Reports key={'rep-' + navCount} {...props} />,
    createExam: <CreateExam key={'create-' + navCount} {...props} />,
    scheduling: <ExamScheduling key={'sched-' + navCount} {...props} />,
    assignStudents: <AssignStudents key={'assign-' + navCount} {...props} />,
    questionBank: <QuestionBankManagement key={'qb-' + navCount} {...props} />,
    syllabus: <SyllabusMapping key={'syll-' + navCount} {...props} />,
    profile: <StudentIntelligenceProfileViewer key={'prof-' + navCount} {...props} />,
    liveRoom: <LiveExamControlRoom key={'live-' + navCount} {...props} />,
    monitoring: <StudentMonitoring key={'mon-' + navCount} {...props} />,
    alerts: <SuspiciousActivityAlerts key={'alert-' + navCount} {...props} />,
  }

  return pages[page] || pages.dashboard
}
