import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import firebaseConfig from '../config/firebase';

// Initialize Firebase (prevent re-initialization in HMR)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Core services — initialized once
// experimentalForceLongPolling: true → Firestore uses HTTP long-polling (bypass ad blocker WebChannel blocks)
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});
const storage = getStorage(app);
const auth = getAuth(app);

// Functions — always initialized so we can connect emulator in DEV
const functions = getFunctions(app, 'us-central1');

// In DEV mode, always connect the Functions emulator (port 5001).
// Only connect Firestore/Storage/Auth emulators when VITE_USE_EMULATORS=true
// (those emulators are not always running locally).
if (import.meta.env.DEV) {
    try {
        connectFunctionsEmulator(functions, 'localhost', 5001);
        console.log('🔥 Connected to Functions emulator (localhost:5001)');
    } catch {
        // Already connected (HMR re-run)
    }

    if (import.meta.env.VITE_USE_EMULATORS === 'true') {
        try {
            connectFirestoreEmulator(db, 'localhost', 8080);
            connectStorageEmulator(storage, 'localhost', 9199);
            connectAuthEmulator(auth, 'http://localhost:9099');
            console.log('🔥 Connected to Firestore/Storage/Auth emulators');
        } catch {
            // Already connected (HMR re-run)
        }
    }
}

export { app, db, storage, auth, functions };
