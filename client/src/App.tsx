import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './modules/auth/LoginPage';
import { EnrollPage } from './modules/auth/EnrollPage';
import { AddDevicePage } from './modules/auth/AddDevicePage';
import { ProtectedRoute } from './modules/auth/ProtectedRoute';
import { useInactivityLogout } from './modules/auth/useInactivityLogout';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { AdminPage } from './modules/admin/AdminPage';
import { useAuthStore } from './store/auth';

/** El rol decide la consola: admin gestiona maestros, operadora despacha. */
function Home() {
  const role = useAuthStore((state) => state.user?.role);
  return role === 'admin' ? <AdminPage /> : <DashboardPage />;
}

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
        path="/devices"
        element={
          <ProtectedRoute>
            <AddDevicePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
