import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute.jsx';

const StudentDashboard = lazy(() => import('../pages/student/Dashboard/StudentDashboard.jsx'));
const UpcomingExams = lazy(() => import('../pages/student/Exams/UpcomingExams.jsx'));
const ExamInstructions = lazy(() => import('../pages/student/Exams/ExamInstructions.jsx'));
const PreExamSecurityCheck = lazy(() => import('../pages/student/Exams/PreExamSecurityCheck.jsx'));
const FaceVerification = lazy(() => import('../pages/student/Exams/FaceVerification.jsx'));
const DeviceCheck = lazy(() => import('../pages/student/Exams/DeviceCheck.jsx'));
const VoiceVerification = lazy(() => import('../pages/student/Exams/VoiceVerification.jsx'));
const ExamInterface = lazy(() => import('../pages/student/Exams/ExamInterface.jsx'));
const SubmissionConfirmation = lazy(() => import('../pages/student/Exams/SubmissionConfirmation.jsx'));
const Result = lazy(() => import('../pages/student/Exams/Result.jsx'));
const IntelligenceProfile = lazy(() => import('../pages/student/Analytics/IntelligenceProfile.jsx'));
const StudentPerformanceAnalytics = lazy(() => import('../pages/student/Analytics/StudentPerformanceAnalytics.jsx'));
const StudentProfile = lazy(() => import('../pages/student/Profile/StudentProfile.jsx'));
const Settings = lazy(() => import('../pages/student/Settings/Settings.jsx'));
const StudentClasses = lazy(() => import('../pages/student/Classes/StudentClasses.jsx'));
const StudentClassDetail = lazy(() => import('../pages/student/Classes/StudentClassDetail.jsx'));

const Guard = ({ children }) => <ProtectedRoute requiredRole="student">{children}</ProtectedRoute>;

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-container">
      <div className="animate-pulse text-on-surface-variant text-body-md">Loading...</div>
    </div>
  );
}

export default function StudentRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
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
        <Route path="/profile" element={<Guard><StudentProfile /></Guard>} />
        <Route path="/settings" element={<Guard><Settings /></Guard>} />
        <Route path="/classes" element={<Guard><StudentClasses /></Guard>} />
        <Route path="/classes/:classId" element={<Guard><StudentClassDetail /></Guard>} />
      </Routes>
    </Suspense>
  );
}
