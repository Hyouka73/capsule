import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useAppConfig } from './context/AppConfigContext';
import Teaser from './components/Teaser/Teaser';
import AdminLogin from './modules/admin/AdminLogin';
import AdminRegister from './modules/auth/AdminRegister';
import AdminDashboard from './modules/admin/AdminDashboard';
import UserDashboard from './modules/user/UserDashboard';
import JoinInvite from './modules/auth/JoinInvite';
import WelcomeScreen from './modules/auth/WelcomeScreen';
import RevokedScreen from './modules/auth/RevokedScreen';
import LoadingScreen from './components/ui/LoadingScreen/LoadingScreen';
import { PastelToastProvider } from './components/ui/PastelToast/PastelToast';
import { BingoProvider } from './context/BingoContext';
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
  const { 
    isAdmin, 
    isAuthenticated, 
    isRevoked,
    isLoading, 
    welcomeSeen,
    teaserCompleted
  } = useAuth();

  const { teaser, isConfigLoaded } = useAppConfig();
  const teaserEnabled = teaser?.isEnabled !== false; // treat undefined as true (safe default)

  // While resolving Firebase auth, show nothing (prevents flash)
  if (isLoading) return <LoadingScreen />;

  // If authenticated, we MUST wait for teaser/welcome progress to be loaded from Firestore 
  // AND for the app config to be loaded from the backend, 
  // before making routing decisions, to avoid flashes of the wrong screen.
  if (isAuthenticated && (!isConfigLoaded || teaserCompleted === null || welcomeSeen === null)) return <LoadingScreen />;

  // Blocking screen if account is revoked
  if (isRevoked) return <RevokedScreen />;

  return (
    <PastelToastProvider>
        <Routes>
        {/* Raíz Dispatcher: Redirige según el estado de la sesión y el progreso */}
        <Route path="/" element={
          !isAuthenticated 
            ? <Navigate to="/join" replace /> 
            : isAdmin 
              ? <Navigate to="/admin" replace />
              : (teaserEnabled && teaserCompleted === false)
                ? <Navigate to="/teaser" replace />
                : welcomeSeen === false
                  ? <Navigate to="/welcome" replace />
                  : <Navigate to="/app" replace />
        } />

        {/* Flujo de invitación (público) */}
        <Route path="/join" element={
          isAuthenticated 
            ? <Navigate to="/" replace />
            : <><JoinInvite /><VersionBadge /></>
        } />

        {/* Teaser (protegido por estado) — solo si está habilitado y no ha sido completado */}
        <Route path="/teaser" element={
          !isAuthenticated 
            ? <Navigate to="/join" replace />
            : isAdmin
              ? <Navigate to="/admin" replace />
              : (!teaserEnabled || teaserCompleted === true)
                ? <Navigate to="/" replace />
                : <><Teaser /><VersionBadge /></>
        } />

        {/* Pantalla de Bienvenida (protegida) — accesible después del Teaser (o si está deshabilitado) */}
        <Route path="/welcome" element={
          !isAuthenticated 
            ? <Navigate to="/join" replace />
            : isAdmin
              ? <Navigate to="/admin" replace />
              : (teaserEnabled && teaserCompleted === false)
                ? <Navigate to="/teaser" replace />
                : welcomeSeen === true
                  ? <Navigate to="/app" replace />
                  : <><WelcomeScreen /><VersionBadge /></>
        } />

        {/* Admin: register (public) + login público + dashboard protegido */}
        <Route path="/admin/register" element={
          isAdmin
            ? <Navigate to="/admin" replace />
            : <><AdminRegister /><VersionBadge /></>
        } />
        <Route path="/admin/login" element={
          isAdmin
            ? <Navigate to="/admin" replace />
            : <><AdminLogin /><VersionBadge /></>
        } />
        <Route path="/admin/*" element={
          isAdmin
            ? <BingoProvider><AdminDashboard /><VersionBadge /></BingoProvider>
            : <><AdminLogin /><VersionBadge /></>
        } />

        {/* Dashboard de usuario (protegido) */}
        <Route path="/app/*" element={
          !isAuthenticated
            ? <Navigate to="/join" replace />
            : isAdmin
              ? <Navigate to="/admin" replace />
              : (teaserEnabled && teaserCompleted === false)
                ? <Navigate to="/teaser" replace />
                : welcomeSeen === false
                  ? <Navigate to="/welcome" replace />
                  : <BingoProvider><UserDashboard /><VersionBadge /></BingoProvider>
        } />

        {/* Fallback: redirigir a raíz para que el dispatcher decida */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </PastelToastProvider>
  );
}
