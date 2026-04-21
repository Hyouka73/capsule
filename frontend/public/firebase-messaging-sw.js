// Import the scripts for the messaging service worker
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Generated dynamically - DO NOT EDIT MANUALLY
firebase.initializeApp({
    apiKey: "AIzaSyC2WR9DNcqiGOfJDJviXHYzfMI3XrCXwto",
    authDomain: "capsule-valentins-day.firebaseapp.com",
    projectId: "capsule-valentins-day",
    storageBucket: "capsule-valentins-day.firebasestorage.app",
    messagingSenderId: "624085766610",
    appId: "1:624085766610:web:d6bcabcace8fc14fd0380b"
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

    const notificationTitle = payload.data?.title || payload.notification?.title || '🔔 ¡Nuevo aviso!';
    const notificationOptions = {
        body: payload.data?.body || payload.notification?.body || 'Abre la app para descubrir qué hay de nuevo.',
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
