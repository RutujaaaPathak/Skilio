import { useState } from 'react'
import TeacherDashboard from './Dashboard/TeacherDashboard.jsx'
import AnswerEvaluation from './Evaluation/AnswerEvaluation.jsx'
import Reports from './Evaluation/Reports.jsx'
import CreateExam from './ExamManagement/CreateExam.jsx'
import ExamScheduling from './ExamManagement/ExamScheduling.jsx'
import QuestionBankManagement from './ExamManagement/QuestionBankManagement.jsx'
import SyllabusMapping from './ExamManagement/SyllabusMapping.jsx'
import StudentIntelligenceProfileViewer from './Intelligence/StudentIntelligenceProfileViewer.jsx'
import LiveExamControlRoom from './Monitoring/LiveExamControlRoom.jsx'
import StudentMonitoring from './Monitoring/StudentMonitoring.jsx'
import SuspiciousActivityAlerts from './Monitoring/SuspiciousActivityAlerts.jsx'

export default function TeacherPortal() {
  const [page, setPage] = useState('dashboard')

  const props = { page, setPage }
  const pages = {
    dashboard: <TeacherDashboard {...props} />,
    answerEvaluation: <AnswerEvaluation {...props} />,
    reports: <Reports {...props} />,
    createExam: <CreateExam {...props} />,
    scheduling: <ExamScheduling {...props} />,
    questionBank: <QuestionBankManagement {...props} />,
    syllabus: <SyllabusMapping {...props} />,
    profile: <StudentIntelligenceProfileViewer {...props} />,
    liveRoom: <LiveExamControlRoom {...props} />,
    monitoring: <StudentMonitoring {...props} />,
    alerts: <SuspiciousActivityAlerts {...props} />,
  }

  return pages[page] || pages.dashboard
}
