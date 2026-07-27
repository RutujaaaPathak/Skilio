import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import StudentRoutes from './StudentRoutes.jsx';
import TeacherPortal from '../pages/teacher/TeacherPortal.jsx';
import AdminRoutes from './AdminRoutes.jsx';
import ProtectedRoute from '../components/ProtectedRoute.jsx';

const Login = lazy(() => import('../pages/student/Auth/Login.jsx'));
const Signup = lazy(() => import('../pages/student/Auth/Signup.jsx'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword.jsx'));
const VerificationPending = lazy(() => import('../pages/auth/VerificationPending.jsx'));
const TotpSetup = lazy(() => import('../pages/auth/TotpSetup.jsx'));
const TotpChallenge = lazy(() => import('../pages/auth/TotpChallenge.jsx'));

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-container">
      <div className="animate-pulse text-on-surface-variant text-body-md">Loading...</div>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
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
    </Suspense>
  );
}
