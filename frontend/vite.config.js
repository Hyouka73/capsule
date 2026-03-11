import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
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
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,   // ← borra cachés de versiones anteriores del SW
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Exclude firebase-messaging-sw.js from precaching
        globIgnores: ['firebase-messaging-sw.js'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          // 1. Navegaciones HTML — NetworkFirst para recibir siempre la shell nueva
          //    Si la red falla, sirve el index.html cacheado (offline support)
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-navigation',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
            },
          },
          // 2. APIs de Firebase — NetworkFirst, sin caché persistente
          {
            urlPattern: ({ url }) =>
              url.hostname.includes('firestore.googleapis.com') ||
              url.hostname.includes('firebase.googleapis.com') ||
              url.hostname.includes('identitytoolkit.googleapis.com'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-api',
              networkTimeoutSeconds: 10,
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
        name: 'Capsule',
        short_name: 'Capsule',
        description: 'Nuestros recuerdos, siempre contigo',
        theme_color: '#f472b6',
        background_color: '#0f0f1a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
    tailwindcss(),
  ],
})
