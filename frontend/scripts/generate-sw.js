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

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo.svg',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
`;

const swPath = path.resolve(__dirname, '../public/firebase-messaging-sw.js');
fs.writeFileSync(swPath, template);

console.log('✅ firebase-messaging-sw.js generated successfully with environment variables.');
