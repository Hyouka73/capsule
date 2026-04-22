import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useAppConfig } from './context/AppConfigContext';
import { useMemoriesSync } from './hooks/useMemoriesSync';
import { useSnapshotsSync } from './hooks/useSnapshotsSync';
import Teaser from './components/Teaser/Teaser';
import AdminLogin from './modules/admin/AdminLogin';
import AdminRegister from './modules/auth/AdminRegister';
import AdminDashboard from './modules/admin/AdminDashboard';
import UserDashboard from './modules/user/UserDashboard';
import JoinInvite from './modules/auth/JoinInvite';
import WelcomeScreen from './modules/auth/WelcomeScreen';
import RevokedScreen from './modules/auth/RevokedScreen';
import LoadingScreen from './components/ui/LoadingScreen/LoadingScreen';
import { SpecialEventOverlay } from './modules/events';
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

  useMemoriesSync();
  useSnapshotsSync();

  const { teaser } = useAppConfig();
  const teaserEnabled = teaser?.isEnabled !== false;
  
  // ROUTER RESILIENTE: Si tenemos un perfil en caché, asumimos acceso hasta que Firebase demuestre lo contrario (si hay red)
  const isSessionActive = localStorage.getItem('capsule_session_active') === 'true';
  const hasValidSession = isAuthenticated || isSessionActive;

  // ── MANIFEST SWAPPER (PRO PWA) ──
  useEffect(() => {
    if (hasValidSession) {
      const manifestLink = document.getElementById('manifest-link');
      if (manifestLink) {
        // Change manifest based on role to dynamic shortcuts if supported
        // Added cache-buster to ensure the browser re-evaluates
        const v = Date.now();
        manifestLink.setAttribute('href', isAdmin ? `/manifest-admin.json?v=${v}` : `/manifest-user.json?v=${v}`);
      }
    } else {
      const manifestLink = document.getElementById('manifest-link');
      if (manifestLink) {
        // Default manifest has no shortcuts (for public view)
        manifestLink.setAttribute('href', '/manifest.json');
      }
    }
  }, [hasValidSession, isAdmin]);
  // While resolving Firebase auth, show nothing (prevents flash)
  if (isLoading) return <LoadingScreen />;

  // Blocking screen if account is revoked
  if (isRevoked) return <RevokedScreen />;

  return (
    <PastelToastProvider>
        <SpecialEventOverlay>
        <Routes>
        {/* Raíz Dispatcher: Redirige según el estado de la sesión y el progreso */}
        <Route path="/" element={
          !hasValidSession 
            ? <Navigate to="/join" replace /> 
            : isAdmin 
              ? <Navigate to={`/admin${window.location.search}`} replace />
              : new URLSearchParams(window.location.search).has('action') // ← PRIORIDAD: Atajos (acción pendiente)
                ? <Navigate to={`/app${window.location.search}`} replace />
                : (teaserEnabled && teaserCompleted === false)
                  ? <Navigate to={`/teaser${window.location.search}`} replace />
                  : welcomeSeen === false
                    ? <Navigate to={`/welcome${window.location.search}`} replace />
                    : <Navigate to={`/app${window.location.search}`} replace />
        } />

        {/* Flujo de invitación (público) */}
        <Route path="/join" element={
          hasValidSession 
            ? <Navigate to="/" replace />
            : <><JoinInvite /><VersionBadge /></>
        } />

        {/* Teaser (protegido por estado) — solo si está habilitado y no ha sido completado */}
        <Route path="/teaser" element={
          !hasValidSession 
            ? <Navigate to="/join" replace />
            : isAdmin
              ? <Navigate to="/admin" replace />
              : (!teaserEnabled || teaserCompleted === true)
                ? <Navigate to="/" replace />
                : <><Teaser /><VersionBadge /></>
        } />

        {/* Pantalla de Bienvenida (protegida) — accesible después del Teaser (o si está deshabilitado) */}
        <Route path="/welcome" element={
          !hasValidSession 
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
          !hasValidSession
            ? <Navigate to="/join" replace />
            : isAdmin
              ? <Navigate to={`/admin${window.location.search}`} replace />
              : (teaserEnabled && teaserCompleted === false)
                ? <Navigate to={`/teaser${window.location.search}`} replace />
                : welcomeSeen === false
                  ? <Navigate to={`/welcome${window.location.search}`} replace />
                  : (
                    <BingoProvider>
                      <UserDashboard />
                      <VersionBadge />
                    </BingoProvider>
                  )
        } />

        {/* Accesos directos (App Shortcuts) — Redirigir al dashboard adecuado con acción específica */}
        <Route path="/snapshots/capture" element={
          !hasValidSession 
            ? <Navigate to="/join" replace /> 
            : isAdmin
              ? <Navigate to={`/admin${window.location.search}${window.location.search ? '&' : '?'}action=capture`} replace />
              : <Navigate to={`/app${window.location.search}${window.location.search ? '&' : '?'}action=capture`} replace />
        } />
        <Route path="/cita/instantanea" element={
          !hasValidSession 
            ? <Navigate to="/join" replace /> 
            : isAdmin
              ? <Navigate to="/admin" replace /> 
              : <Navigate to={`/app${window.location.search}${window.location.search ? '&' : '?'}action=cita`} replace />
        } />
        <Route path="/snapshots" element={
          !hasValidSession 
            ? <Navigate to="/join" replace /> 
            : <Navigate to="/app?tab=galeria" replace />
        } />

        {/* Fallback: redirigir a raíz para que el dispatcher decida */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </SpecialEventOverlay>
    </PastelToastProvider>
  );
}
