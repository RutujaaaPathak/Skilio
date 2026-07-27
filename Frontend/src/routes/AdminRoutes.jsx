import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

const AdminDashboard = lazy(() => import('../pages/admin/Dashboard/AdminDashboard.jsx'));
const AnalyticsDashboard = lazy(() => import('../pages/admin/Analytics/AnalyticsDashboard.jsx'));
const BatchClassManagement = lazy(() => import('../pages/admin/Batch/BatchClassManagement.jsx'));
const BulkInvite = lazy(() => import('../pages/admin/BulkInvite/BulkInvite.jsx'));
const DepartmentManagement = lazy(() => import('../pages/admin/Department/DepartmentManagement.jsx'));
const InstitutionManagement = lazy(() => import('../pages/admin/Institution/InstitutionManagement.jsx'));
const ExamPolicySettings = lazy(() => import('../pages/admin/Policies/ExamPolicySettings.jsx'));
const StudentManagement = lazy(() => import('../pages/admin/Student/StudentManagement.jsx'));
const SubscriptionBilling = lazy(() => import('../pages/admin/Subscription/SubscriptionBilling.jsx'));
const TeacherManagement = lazy(() => import('../pages/admin/Teacher/TeacherManagement.jsx'));
const UserManagement = lazy(() => import('../pages/admin/UserManagement/UserManagement.jsx'));

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-container">
      <div className="animate-pulse text-on-surface-variant text-body-md">Loading...</div>
    </div>
  );
}

export default function AdminRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="analytics" element={<AnalyticsDashboard />} />
        <Route path="batch" element={<BatchClassManagement />} />
        <Route path="bulk-invite" element={<BulkInvite />} />
        <Route path="department" element={<DepartmentManagement />} />
        <Route path="institution" element={<InstitutionManagement />} />
        <Route path="policies" element={<ExamPolicySettings />} />
        <Route path="student" element={<StudentManagement />} />
        <Route path="subscription" element={<SubscriptionBilling />} />
        <Route path="teacher" element={<TeacherManagement />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
