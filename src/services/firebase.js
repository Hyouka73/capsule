import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import firebaseConfig from '../config/firebase';

// Initialize Firebase (prevent re-initialization in HMR)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Core services — initialized once
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Connect to emulators in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
    try {
        connectFirestoreEmulator(db, 'localhost', 8080);
        connectStorageEmulator(storage, 'localhost', 9199);
        connectAuthEmulator(auth, 'http://localhost:9099');
        console.log('🔥 Connected to Firebase emulators');
    } catch {
        // Emulators already connected (HMR re-run)
    }
}

export { app, db, storage, auth };
