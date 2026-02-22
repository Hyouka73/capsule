import { useAuth } from './hooks/useAuth';
import Teaser from './components/Teaser/Teaser';
import AdminLogin from './modules/admin/AdminLogin';
import AdminDashboard from './modules/admin/AdminDashboard';
import UserDashboard from './modules/user/UserDashboard';
import { PastelToastProvider } from './components/ui/PastelToast/PastelToast';
import './App.css';

/**
 * App — top-level routing
 *
 * Routes:
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
  const isAdminRoute = path.startsWith('/admin');
  const isAppRoute = path.startsWith('/app');

  // While resolving Firebase auth, show nothing (prevents flash)
  if (isLoading) return <LoadingScreen />;

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

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0f',
      color: '#c9a96e',
      fontSize: '1.5rem',
    }}>
      ✦
    </div>
  );
}
