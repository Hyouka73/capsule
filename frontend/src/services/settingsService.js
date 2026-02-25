import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const SETTINGS_DOC_PATH = 'config/global';

/**
 * Persist global application settings
 */
export async function saveGlobalSettings(settings) {
    const docRef = doc(db, SETTINGS_DOC_PATH);
    await setDoc(docRef, {
        ...settings,
        updatedAt: new Date().toISOString()
    }, { merge: true });
}

/**
 * Fetch global application settings once
 */
export async function getGlobalSettings() {
    const docRef = doc(db, SETTINGS_DOC_PATH);
    const snap = await getDoc(docRef);
    if (snap.exists()) return snap.data();
    return null;
}

/**
 * Subscribe to global application settings
 */
export function subscribeToGlobalSettings(callback) {
    const docRef = doc(db, SETTINGS_DOC_PATH);
    return onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
            callback(snap.data());
        } else {
            callback(null);
        }
    });
}

/**
 * Save snapshot config to appConfig/main (read by AppConfigContext in real-time)
 */
export async function saveSnapshotConfig(snapshotConfig) {
    const docRef = doc(db, 'appConfig', 'main');
    await setDoc(docRef, { snapshotConfig }, { merge: true });
}
