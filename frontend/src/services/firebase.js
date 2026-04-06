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
isSupported().then(supported => {
    if (supported) {
        messaging = getMessaging(app);
        console.log('[Firebase] Messaging supported and initialized.');
    }
});

// In DEV mode, always connect the emulators when needed.
if (import.meta.env.DEV) {
    /**
     * DYNAMIC EMULATOR HOST DETECTION
     * 1. Check for manual override in localStorage (useful for mobile via tunnel)
     * 2. If accessing via Local IP or localhost, use current hostname.
     * 3. Default to 127.0.0.1 for maximum compatibility with local HTTPS pages.
     */
    const savedHost = localStorage.getItem('firebase_emulator_host');
    const currentHost = window.location.hostname;
    const isLocalAddress = currentHost === 'localhost' || 
                           currentHost === '127.0.0.1' || 
                           /^192\.168\./.test(currentHost) || 
                           /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(currentHost) || 
                           /^10\./.test(currentHost);

    const emulatorHost = savedHost || (isLocalAddress ? currentHost : '127.0.0.1');
    
    if (!savedHost && !isLocalAddress) {
        console.info(`[Firebase] Using default 127.0.0.1. To test on mobile via tunnel, run: \nlocalStorage.setItem('firebase_emulator_host', 'YOUR_COMPUTER_IP')`);
    }

    try {
        connectFunctionsEmulator(functions, emulatorHost, 5001);
    } catch { /* already connected */ }

    if (import.meta.env.VITE_USE_EMULATORS === 'true') {
        try {
            connectFirestoreEmulator(db, emulatorHost, 8080);
            connectStorageEmulator(storage, emulatorHost, 9199);
            // v9+ connectAuthEmulator expects the full URL including scheme
            connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
        } catch (err) {
            console.warn('[Firebase] Emulator connection error:', err.message);
        }
    }
}

export { app, db, storage, auth, functions, messaging };
