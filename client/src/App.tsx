import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './modules/auth/LoginPage';
import { EnrollPage } from './modules/auth/EnrollPage';
import { ProtectedRoute } from './modules/auth/ProtectedRoute';
import { useInactivityLogout } from './modules/auth/useInactivityLogout';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { useAuthStore } from './store/auth';

export default function App() {
  const restore = useAuthStore((state) => state.restore);

  useEffect(() => {
    void restore();
  }, [restore]);

  useInactivityLogout();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/enroll" element={<EnrollPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
