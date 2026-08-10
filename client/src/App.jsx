import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Loader from './components/common/Loader';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/shared/DashboardPage';
import PropertiesPage from './pages/shared/PropertiesPage';
import MaintenancePage from './pages/shared/MaintenancePage';
import AmenitiesPage from './pages/shared/AmenitiesPage';
import UsersPage from './pages/shared/UsersPage';

const Protected = ({ children, roles }) => {
  const { isAuthenticated, loading, role } = useAuth();
  const location = useLocation();

  if (loading) return <Loader full label="Securing your session…" />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/dashboard" replace />;
  return children;
};

const PublicOnly = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Loader full label="Loading RentMaster…" />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />

      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/properties" element={<PropertiesPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/amenities" element={<AmenitiesPage />} />
        <Route
          path="/users"
          element={
            <Protected roles={['admin', 'owner']}>
              <UsersPage />
            </Protected>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="*"
        element={
          <div className="min-h-screen grid place-items-center bg-hero-gradient px-6">
            <div className="text-center animate-fade-up">
              <p className="text-8xl font-black gradient-text font-display">404</p>
              <h1 className="mt-3 text-2xl font-bold text-ink-900">Page not found</h1>
              <p className="muted mt-2">The page you're looking for doesn't exist or has moved.</p>
              <a href="/dashboard" className="btn-primary mt-6">Back to Dashboard</a>
            </div>
          </div>
        }
      />
    </Routes>
  );
}