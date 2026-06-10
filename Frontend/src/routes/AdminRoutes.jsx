import { Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from '../pages/admin/Dashboard/AdminDashboard.jsx';
import AnalyticsDashboard from '../pages/admin/Analytics/AnalyticsDashboard.jsx';
import BatchClassManagement from '../pages/admin/Batch/BatchClassManagement.jsx';
import DepartmentManagement from '../pages/admin/Department/DepartmentManagement.jsx';
import InstitutionManagement from '../pages/admin/Institution/InstitutionManagement.jsx';
import ExamPolicySettings from '../pages/admin/Policies/ExamPolicySettings.jsx';
import StudentManagement from '../pages/admin/Student/StudentManagement.jsx';
import SubscriptionBilling from '../pages/admin/Subscription/SubscriptionBilling.jsx';
import TeacherManagement from '../pages/admin/Teacher/TeacherManagement.jsx';

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="analytics" element={<AnalyticsDashboard />} />
      <Route path="batch" element={<BatchClassManagement />} />
      <Route path="department" element={<DepartmentManagement />} />
      <Route path="institution" element={<InstitutionManagement />} />
      <Route path="policies" element={<ExamPolicySettings />} />
      <Route path="student" element={<StudentManagement />} />
      <Route path="subscription" element={<SubscriptionBilling />} />
      <Route path="teacher" element={<TeacherManagement />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}
