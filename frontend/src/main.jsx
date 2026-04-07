import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { AppConfigProvider } from './context/AppConfigContext'
import { BingoProvider } from './context/BingoContext'
import { BrowserRouter } from 'react-router-dom'

// ─────────────────────────────────────────────────────────────────────────────
// Build timestamp injected at build time by vite.config.js → define: {}
/* global __BUILD_TIMESTAMP__ */
const CURRENT_BUILD = typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : 'dev';

async function forceUpdate() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      const oldCaches = keys.filter(k => !k.includes(CURRENT_BUILD));
      await Promise.all(oldCaches.map(k => caches.delete(k)));
    }
  } catch (e) {}
  window.location.replace(`/?v=${Date.now()}`);
}

async function checkForUpdate() {
  if (CURRENT_BUILD === 'dev') return;
  // If we just reloaded to avoid a loop, wait for next session
  if (new URLSearchParams(window.location.search).has('v')) return;

  try {
    const res = await fetch(`/version.json?_=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'pragma': 'no-cache', 'cache-control': 'no-store' },
    });
    if (!res.ok) return;
    const data = await res.json();
    const remoteBuild = data.buildTime;
    
    if (remoteBuild && remoteBuild !== CURRENT_BUILD) {
      console.warn('🚀 [Update] New version detected:', data.version || 'unknown');
      await forceUpdate();
    }
  } catch (err) {
    console.error('❌ [Update] Check failed:', err);
  }
}

// Check every time the user returns to the app
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        checkForUpdate();
    }
});

// Initial check on load
checkForUpdate();

// Optional: check every 20 minutes if app stays open
setInterval(checkForUpdate, 1000 * 60 * 20);

// ─────────────────────────────────────────────────────────────────────────────
// React bootstrap
// ─────────────────────────────────────────────────────────────────────────────
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppConfigProvider>
          <BingoProvider>
            <App />
          </BingoProvider>
        </AppConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
