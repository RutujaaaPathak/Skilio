import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute.jsx';
import StudentDashboard from '../pages/student/Dashboard/StudentDashboard.jsx';
import UpcomingExams from '../pages/student/Exams/UpcomingExams.jsx';
import ExamInstructions from '../pages/student/Exams/ExamInstructions.jsx';
import PreExamSecurityCheck from '../pages/student/Exams/PreExamSecurityCheck.jsx';
import FaceVerification from '../pages/student/Exams/FaceVerification.jsx';
import DeviceCheck from '../pages/student/Exams/DeviceCheck.jsx';
import VoiceVerification from '../pages/student/Exams/VoiceVerification.jsx';
import ExamInterface from '../pages/student/Exams/ExamInterface.jsx';
import SubmissionConfirmation from '../pages/student/Exams/SubmissionConfirmation.jsx';
import Result from '../pages/student/Exams/Result.jsx';
import IntelligenceProfile from '../pages/student/Analytics/IntelligenceProfile.jsx';
import StudentPerformanceAnalytics from '../pages/student/Analytics/StudentPerformanceAnalytics.jsx';
import Settings from '../pages/student/Settings/Settings.jsx';

const Guard = ({ children }) => <ProtectedRoute requiredRole="student">{children}</ProtectedRoute>;

export default function StudentRoutes() {
  return (
    <Routes>
      <Route path="/dashboard" element={<Guard><StudentDashboard /></Guard>} />
      <Route path="/exams" element={<Guard><UpcomingExams /></Guard>} />
      <Route path="/exams/instructions" element={<Guard><ExamInstructions /></Guard>} />
      <Route path="/exams/security-check" element={<Guard><PreExamSecurityCheck /></Guard>} />
      <Route path="/exams/face-verification" element={<Guard><FaceVerification /></Guard>} />
      <Route path="/exams/device-check" element={<Guard><DeviceCheck /></Guard>} />
      <Route path="/exams/voice-verification" element={<Guard><VoiceVerification /></Guard>} />
      <Route path="/exams/interface" element={<Guard><ExamInterface /></Guard>} />
      <Route path="/exams/submission" element={<Guard><SubmissionConfirmation /></Guard>} />
      <Route path="/exams/result" element={<Guard><Result /></Guard>} />
      <Route path="/analytics/intelligence" element={<Guard><IntelligenceProfile /></Guard>} />
      <Route path="/analytics/performance" element={<Guard><StudentPerformanceAnalytics /></Guard>} />
      <Route path="/settings" element={<Guard><Settings /></Guard>} />
    </Routes>
  );
}
