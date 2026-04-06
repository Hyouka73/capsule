import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
const envLocalPath = path.resolve(__dirname, '../.env.local');

// Load environment variables
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath, override: true });

const template = `// Import the scripts for the messaging service worker
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Generated dynamically - DO NOT EDIT MANUALLY
firebase.initializeApp({
    apiKey: "${process.env.VITE_FIREBASE_API_KEY || ''}",
    authDomain: "${process.env.VITE_FIREBASE_AUTH_DOMAIN || ''}",
    projectId: "${process.env.VITE_FIREBASE_PROJECT_ID || ''}",
    storageBucket: "${process.env.VITE_FIREBASE_STORAGE_BUCKET || ''}",
    messagingSenderId: "${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''}",
    appId: "${process.env.VITE_FIREBASE_APP_ID || ''}"
});

const messaging = firebase.messaging();

// Force immediate activation to skip the "waiting" state when credentials change
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

messaging.onBackgroundMessage(async (payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // Si la app está abierta y visible, no mostrar notificación nativa.
    // El foreground listener de la app ya mostró el toast.
    const clientList = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    });
    const appIsVisible = clientList.some(client => client.visibilityState === 'visible');
    if (appIsVisible) {
        console.log('[firebase-messaging-sw.js] App is visible, skipping native notification.');
        return;
    }

    const notificationTitle = payload.notification?.title || '📸 ¡Nueva Instantánea!';
    const notificationOptions = {
        body: payload.notification?.body || 'Tu pareja ha capturado un momento para ti.',
        icon: '/logo.svg',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Handle notification click — Focus or open the app on the main screen.
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if ('focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
`;

const swPath = path.resolve(__dirname, '../public/firebase-messaging-sw.js');
fs.writeFileSync(swPath, template);

console.log('✅ firebase-messaging-sw.js generated successfully with environment variables.');
