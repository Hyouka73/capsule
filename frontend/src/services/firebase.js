import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getMessaging, isSupported } from 'firebase/messaging';
import firebaseConfig from '../config/firebase';

// Initialize Firebase (prevent re-initialization in HMR)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Core services — initialized once
const db = initializeFirestore(app, {
    localCache: persistentLocalCache(),
    experimentalAutoDetectLongPolling: true,
});
const storage = getStorage(app);
const auth = getAuth(app);

// Functions — always initialized so we can connect emulator in DEV
const functions = getFunctions(app, 'us-central1');

// Messaging — lazy initialization
let messaging = null;
isSupported().then(supported => {
    if (supported) messaging = getMessaging(app);
});

// In DEV mode, always connect the Functions emulator (port 5001).
// Only connect Firestore/Storage/Auth emulators when VITE_USE_EMULATORS=true
// (those emulators are not always running locally).
if (import.meta.env.DEV) {
    try {
        connectFunctionsEmulator(functions, 'localhost', 5001);
    } catch { /* already connected */ }

    if (import.meta.env.VITE_USE_EMULATORS === 'true') {
        try {
            connectFirestoreEmulator(db, 'localhost', 8080);
            connectStorageEmulator(storage, 'localhost', 9199);
            connectAuthEmulator(auth, 'http://localhost:9099');
        } catch { /* already connected */ }
    }
}

export { app, db, storage, auth, functions, messaging };
