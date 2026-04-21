import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { AppConfigProvider } from './context/AppConfigContext'
import { BingoProvider } from './context/BingoContext'
import { SpecialEventProvider } from './context/SpecialEventContext'
import { BrowserRouter } from 'react-router-dom'

// ─────────────────────────────────────────────────────────────────────────────
// Build timestamp injected at build time by vite.config.js → define: {}
/* global __BUILD_TIMESTAMP__ */
const CURRENT_BUILD = typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : 'dev';

// ─────────────────────────────────────────────────────────────────────────────
// Version Control & Force Update Logic
// ─────────────────────────────────────────────────────────────────────────────

async function forceUpdate() {
  console.warn('🚨 [Update] Forcing absolute update and cache wipe...');
  try {
    // 1. Unregister all service workers
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    // 2. Wipe ALL caches (not just old ones) to ensure total freshness
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (e) {
    console.error('❌ [Update] Cleanup failed:', e);
  }
  
  // 3. Reload with a fresh flag
  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.set('v', Date.now().toString());
  window.location.replace(currentUrl.toString());
}

async function checkForUpdate() {
  if (CURRENT_BUILD === 'dev') return;
  
  const params = new URLSearchParams(window.location.search);
  const v = params.get('v');
  
  // If we just reloaded (within last 15s), skip to avoid loops
  if (v && (Date.now() - parseInt(v)) < 15000) {
    console.log('⏳ [Update] Skip check (just reloaded)');
    return;
  }

  try {
    // Force Service Worker to check for updates on the server
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        console.log('🔄 [Update] Triggering Service Worker background check...');
        await reg.update();
      }
    }

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
    } else {
      console.log('✅ [Update] App is up to date:', CURRENT_BUILD);
    }
  } catch (err) {
    console.error('❌ [Update] Check failed:', err);
  }
}

// ── URL Cleanup ──
// Remove the 'v' parameter from history after a short delay so it doesn't 
// block future updates if the user stays on the page or reloads.
const cleanupUrl = () => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('v')) {
        url.searchParams.delete('v');
        window.history.replaceState({}, '', url.toString());
        console.log('🧹 [Update] Navigation URL cleaned');
    }
};

// Check every time the user returns to the app
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        checkForUpdate();
    }
});

// Initial check and cleanup
setTimeout(cleanupUrl, 2000);
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
          <SpecialEventProvider>
            <BingoProvider>
              <App />
            </BingoProvider>
          </SpecialEventProvider>
        </AppConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}
