import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getMessaging, isSupported } from 'firebase/messaging';
import firebaseConfig from '../config/firebase';

// Initialize Firebase (prevent re-initialization in HMR)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Core services — initialized once (singleton pattern to avoid HMR errors)
let db;
try {
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
        }),
        experimentalAutoDetectLongPolling: true,
    });
} catch (e) {
    if (e.code === 'failed-precondition' || e.message?.includes('already been called')) {
        db = getFirestore(app);
    } else {
        throw e;
    }
}
const storage = getStorage(app);
const auth = getAuth(app);

// Functions — always initialized so we can connect emulator in DEV
const functions = getFunctions(app, 'us-central1');

// Messaging — lazy initialization
let messaging = null;
// SKIP Messaging in emulator mode to avoid installations 400 errors during Callable calls
if (import.meta.env.VITE_USE_EMULATORS !== 'true') {
    isSupported().then(supported => {
        if (supported) messaging = getMessaging(app);
    });
}

// In DEV mode, always connect the emulators when needed.
if (import.meta.env.DEV) {
    // Normalize localhost to 127.0.0.1 to avoid IPv6 (::1) issues on Windows
    let host = window.location.hostname;
    if (host === 'localhost') host = '127.0.0.1';
    
    try {
        connectFunctionsEmulator(functions, host, 5001);
    } catch { /* already connected */ }

    if (import.meta.env.VITE_USE_EMULATORS === 'true') {
        try {
            connectFirestoreEmulator(db, host, 8080);
            connectStorageEmulator(storage, host, 9199);
            // v9+ connectAuthEmulator expects the full URL including scheme
            connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
            console.log(`[Firebase] Connected to emulators on ${host}`);
        } catch (err) {
            console.warn('[Firebase] Emulator connection error:', err.message);
        }
    }
}

export { app, db, storage, auth, functions, messaging };
