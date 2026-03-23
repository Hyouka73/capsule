import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { AppConfigProvider } from './context/AppConfigContext.jsx'
import { BingoProvider } from './context/BingoContext.jsx'
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
  if (new URLSearchParams(window.location.search).has('v')) return;
  try {
    const res = await fetch(`/version.json?_=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'pragma': 'no-cache', 'cache-control': 'no-store' },
    });
    if (!res.ok) return;
    const { buildTime } = await res.json();
    if (buildTime && buildTime !== CURRENT_BUILD) {
      await forceUpdate();
    }
  } catch {}
}

// Solo esto. Sin setInterval, sin visibilitychange.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!new URLSearchParams(window.location.search).has('v')) {
      window.location.reload();
    }
  });
}

// checkForUpdate();

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
