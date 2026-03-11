import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Teaser from './components/Teaser/Teaser';
import AdminLogin from './modules/admin/AdminLogin';
import AdminDashboard from './modules/admin/AdminDashboard';
import UserDashboard from './modules/user/UserDashboard';
import JoinInvite from './modules/auth/JoinInvite';
import LoadingScreen from './components/ui/LoadingScreen/LoadingScreen';
import { PastelToastProvider } from './components/ui/PastelToast/PastelToast';
import './App.css';
import VersionBadge from './components/ui/VersionBadge/VersionBadge';

/**
 * App — top-level routing (React Router)
 *
 * Routes:
 *   /             → Teaser (unauthenticated) | redirect to /app (authenticated)
 *   /join         → JoinInvite (public, partner onboarding)
 *   /admin/login  → AdminLogin (public)
 *   /admin/*      → AdminDashboard (admin only) | AdminLogin (fallback)
 *   /app/*        → UserDashboard (authenticated) | redirect to /join (fallback)
 *   /*            → Teaser (fallback)
 */
export default function App() {
  const { isAdmin, isAuthenticated, isLoading } = useAuth();

  // While resolving Firebase auth, show nothing (prevents flash)
  if (isLoading) return <LoadingScreen />;

  return (
    <PastelToastProvider>
      <Routes>
        {/* Raíz: sesión activa → /app, sin sesión → Teaser */}
        <Route path="/" element={
          isAuthenticated
            ? <Navigate to="/app" replace />
            : <><Teaser /><VersionBadge /></>
        } />

        {/* Flujo de invitación (público) */}
        <Route path="/join" element={
          <><JoinInvite /><VersionBadge /></>
        } />

        {/* Admin: login público + dashboard protegido */}
        <Route path="/admin/login" element={
          isAdmin
            ? <Navigate to="/admin" replace />
            : <><AdminLogin /><VersionBadge /></>
        } />
        <Route path="/admin/*" element={
          isAdmin
            ? <><AdminDashboard /><VersionBadge /></>
            : <><AdminLogin /><VersionBadge /></>
        } />

        {/* Dashboard de usuario (protegido) */}
        {/* Admin should never be in /app → redirect to their panel */}
        <Route path="/app/*" element={
          !isAuthenticated
            ? <Navigate to="/join" replace />
            : isAdmin
              ? <Navigate to="/admin" replace />
              : <><UserDashboard /><VersionBadge /></>
        } />

        {/* Fallback: cualquier otra ruta → Teaser */}
        <Route path="*" element={
          isAuthenticated
            ? <Navigate to="/app" replace />
            : <><Teaser /><VersionBadge /></>
        } />
      </Routes>
    </PastelToastProvider>
  );
}
