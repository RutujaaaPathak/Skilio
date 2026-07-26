import { Navigate, Route, Routes } from 'react-router-dom';
import Login from '../pages/student/Auth/Login.jsx';
import Signup from '../pages/student/Auth/Signup.jsx';
import ForgotPassword from '../pages/auth/ForgotPassword.jsx';
import ResetPassword from '../pages/auth/ResetPassword.jsx';
import VerificationPending from '../pages/auth/VerificationPending.jsx';
import TotpSetup from '../pages/auth/TotpSetup.jsx';
import TotpChallenge from '../pages/auth/TotpChallenge.jsx';
import StudentRoutes from './StudentRoutes.jsx';
import TeacherPortal from '../pages/teacher/TeacherPortal.jsx';
import AdminRoutes from './AdminRoutes.jsx';
import ProtectedRoute from '../components/ProtectedRoute.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/student/auth/login" element={<Login />} />
      <Route path="/teacher/auth/login" element={<Login defaultRole="teacher" />} />
      <Route path="/student/auth/signup" element={<Signup />} />
      <Route path="/teacher/auth/signup" element={<Signup defaultRole="teacher" />} />
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />
      <Route path="/auth/verify-email-pending" element={<VerificationPending />} />
      <Route path="/auth/totp-setup" element={<TotpSetup />} />
      <Route path="/auth/totp-challenge" element={<TotpChallenge />} />
      <Route path="/student/*" element={<StudentRoutes />} />
      <Route path="/teacher/*" element={<ProtectedRoute requiredRole="teacher"><TeacherPortal /></ProtectedRoute>} />
      <Route path="/admin/*" element={<ProtectedRoute requiredRole="admin"><AdminRoutes /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
