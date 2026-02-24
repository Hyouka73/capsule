import { useAuth } from './hooks/useAuth';
import Teaser from './components/Teaser/Teaser';
import AdminLogin from './modules/admin/AdminLogin';
import AdminDashboard from './modules/admin/AdminDashboard';
import UserDashboard from './modules/user/UserDashboard';
import JoinInvite from './modules/auth/JoinInvite';
import LoadingScreen from './components/ui/LoadingScreen/LoadingScreen';
import { PastelToastProvider } from './components/ui/PastelToast/PastelToast';
import './App.css';

/**
 * App — top-level routing
 *
 * Routes:
 *   /join         → JoinInvite (public, partner onboarding)
 *   /admin/login  → AdminLogin (public)
 *   /admin        → AdminDashboard (admin only)
 *   /app          → UserDashboard (partner view)
 *   /*            → Teaser (partner / unauthenticated)
 *
 * No router library needed — path-based routing with window.location.
 */
export default function App() {
  const { isAdmin, isLoading } = useAuth();
  const path = window.location.pathname;

  const isJoinRoute = path.startsWith('/join');
  const isAdminRoute = path.startsWith('/admin');
  const isAppRoute = path.startsWith('/app');

  // While resolving Firebase auth, show nothing (prevents flash)
  if (isLoading) return <LoadingScreen />;

  // Invitation flow
  if (isJoinRoute) {
    return (
      <PastelToastProvider>
        <JoinInvite />
      </PastelToastProvider>
    );
  }

  // Admin routes
  if (isAdminRoute) {
    return (
      <PastelToastProvider>
        {isAdmin ? <AdminDashboard /> : <AdminLogin />}
      </PastelToastProvider>
    );
  }

  // Partner routes (Dashboard)
  if (isAppRoute) {
    return (
      <PastelToastProvider>
        <UserDashboard />
      </PastelToastProvider>
    );
  }

  // Default: teaser
  return <Teaser />;
}
