// Firebase configuration
// Replace with your actual Firebase project credentials
// .trim() strips any \r\n that Vercel may inject into env var values,
// which would produce %0D%0A in Storage URLs and break CORS.
const firebaseConfig = {
    apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || '').trim(),
    authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
    projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim(),
    storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim(),
    messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim(),
    appId: (import.meta.env.VITE_FIREBASE_APP_ID || '').trim(),
    vapidKey: (import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim(),
};

export default firebaseConfig;
