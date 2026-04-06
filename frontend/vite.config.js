import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// ── Build timestamp injected into public/version.json at build time ──────────
// This file is served with no-store headers (vercel.json) and fetched by
// main.jsx to detect when the app is stale — bypassing SW caching entirely.
const BUILD_TIMESTAMP = Date.now().toString();

function viteVersionPlugin() {
  return {
    name: 'version-json',
    // runs after bundle is written
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist');
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(
        path.join(outDir, 'version.json'),
        JSON.stringify({ buildTime: BUILD_TIMESTAMP }),
        'utf-8'
      );
    },
    // also copy to public/ so `vite dev` works
    buildStart() {
      const publicDir = path.resolve(__dirname, 'public');
      fs.mkdirSync(publicDir, { recursive: true });
      fs.writeFileSync(
        path.join(publicDir, 'version.json'),
        JSON.stringify({ buildTime: BUILD_TIMESTAMP }),
        'utf-8'
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    // Injected at build time — compared against /version.json at runtime
    __BUILD_TIMESTAMP__: JSON.stringify(BUILD_TIMESTAMP),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.18'),
  },
  server: {
    host: true,
    port: 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/storage', 'firebase/functions'],
          'framer-motion': ['framer-motion'],
          'map-vendor': ['maplibre-gl'],
          'exif-vendor': ['exifr'],
        }
      }
    }
  },
  plugins: [
    react(),
    viteVersionPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['firebase-messaging-sw.js'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/version\.json/,  // ← cubre /version.json?_=123 también
            handler: 'NetworkOnly',
          },
          // APIs de Firebase — NetworkFirst, sin caché persistente
          {
            urlPattern: ({ url }) =>
              url.hostname.includes('firestore.googleapis.com') ||
              url.hostname.includes('firebase.googleapis.com') ||
              url.hostname.includes('identitytoolkit.googleapis.com'),
            handler: 'NetworkOnly',
            options: {
              cacheName: 'firebase-api',
            },
          },
          // 3. Imágenes de Firebase Storage — CacheFirst con expiración razonable
          {
            urlPattern: ({ url }) =>
              url.hostname.includes('firebasestorage.googleapis.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          // 4. Fuentes externas — CacheFirst (cambian muy raramente)
          {
            urlPattern: ({ url }) =>
              url.hostname === 'fonts.googleapis.com' ||
              url.hostname === 'fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'external-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Nuestro Universo Privado',
        short_name: 'Nosotros',
        description: 'Una historia de amor infinita ✨',
        theme_color: '#0a0a12',
        background_color: '#0a0a12',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Tomar Snapshot',
            short_name: 'Snapshot',
            description: 'Captura un momento al instante',
            url: '/snapshots/capture',
            icons: [
              { src: '/icons/camera_icon.png', sizes: '96x96' },
              { src: '/icons/camera_icon.png', sizes: '192x192' }
            ]
          },
          {
            name: 'Ver Recuerdos',
            short_name: 'Recuerdos',
            description: 'Mira vuestra historia de amor',
            url: '/snapshots',
            icons: [
              { src: '/icons/image_icon.png', sizes: '96x96' },
              { src: '/icons/image_icon.png', sizes: '192x192' }
            ]
          }
        ]
      },
    }),
    tailwindcss(),
  ],
})
