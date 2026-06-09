import { Navigate, Route, Routes } from 'react-router-dom';
import SplashScreen from './pages/student/SplashScreen/SplashScreen.jsx';
import Login from './pages/student/Auth/Login.jsx';
import Signup from './pages/student/Auth/Signup.jsx';
import StudentDashboard from './pages/student/Dashboard/StudentDashboard.jsx';
import UpcomingExams from './pages/student/Exams/UpcomingExams.jsx';
import ExamInstructions from './pages/student/Exams/ExamInstructions.jsx';
import PreExamSecurityCheck from './pages/student/Exams/PreExamSecurityCheck.jsx';
import FaceVerification from './pages/student/Exams/FaceVerification.jsx';
import DeviceCheck from './pages/student/Exams/DeviceCheck.jsx';
import VoiceVerification from './pages/student/Exams/VoiceVerification.jsx';
import ExamInterface from './pages/student/Exams/ExamInterface.jsx';
import SubmissionConfirmation from './pages/student/Exams/SubmissionConfirmation.jsx';
import Result from './pages/student/Exams/Result.jsx';
import IntelligenceProfile from './pages/student/Analytics/IntelligenceProfile.jsx';
import StudentPerformanceAnalytics from './pages/student/Analytics/StudentPerformanceAnalytics.jsx';
import Settings from './pages/student/Settings/Settings.jsx';
import TeacherPortal from './pages/teacher/TeacherPortal.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SplashScreen />} />
      <Route path="/student/auth/login" element={<Login />} />
      <Route path="/teacher/auth/login" element={<Login defaultRole="teacher" />} />
      <Route path="/student/auth/signup" element={<Signup />} />
      <Route path="/student/dashboard" element={<StudentDashboard />} />
      <Route path="/student/exams" element={<UpcomingExams />} />
      <Route path="/student/exams/instructions" element={<ExamInstructions />} />
      <Route path="/student/exams/security-check" element={<PreExamSecurityCheck />} />
      <Route path="/student/exams/face-verification" element={<FaceVerification />} />
      <Route path="/student/exams/device-check" element={<DeviceCheck />} />
      <Route path="/student/exams/voice-verification" element={<VoiceVerification />} />
      <Route path="/student/exams/interface" element={<ExamInterface />} />
      <Route path="/student/exams/submission" element={<SubmissionConfirmation />} />
      <Route path="/student/exams/result" element={<Result />} />
      <Route path="/student/analytics/intelligence" element={<IntelligenceProfile />} />
      <Route path="/student/analytics/performance" element={<StudentPerformanceAnalytics />} />
      <Route path="/student/settings" element={<Settings />} />
      <Route path="/teacher/*" element={<TeacherPortal />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
