import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/storage', 'firebase/functions'],
          'framer-motion': ['framer-motion'],
          'map-vendor': ['leaflet', 'react-leaflet'],
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Exclude firebase-messaging-sw.js from precaching
        globIgnores: ['firebase-messaging-sw.js'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => {
              return url.href.includes('firestore.googleapis.com') ||
                url.href.includes('firebase') ||
                url.href.includes('identitytoolkit') ||
                url.href.includes('securetoken')
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-apis',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /\.(?:js|css|png|jpg|svg|ico|woff|woff2)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
              },
            },
          },
          {
            urlPattern: ({ url }) => {
              // Handle everything else with StaleWhileRevalidate
              return true
            },
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'general-query',
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
  ],
})
