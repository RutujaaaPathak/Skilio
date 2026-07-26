import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const roleRoutes = {
  student: '/student/dashboard',
  teacher: '/teacher/',
  admin: '/admin/dashboard',
};

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-sm text-on-surface-variant">
          <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={roleRoutes[user.role] || '/'} replace />;
  }

  return children;
}
