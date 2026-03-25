import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const SETTINGS_DOC_PATH = 'appConfig/main';

/**
 * Persist global application settings
 */
export async function saveGlobalSettings(settings) {
    const docRef = doc(db, SETTINGS_DOC_PATH);
    const data = { ...settings, updatedAt: serverTimestamp() };
    
    // Si se están guardando ajustes del mapa, actualizamos el timestamp de sincronización
    if (data.map) {
        data.map.lastActTimestamp = serverTimestamp();
    }
    
    await setDoc(docRef, data, { merge: true });
}

/**
 * Update partial settings
 */
export async function updateConfig(partialSettings) {
    const docRef = doc(db, SETTINGS_DOC_PATH);
    const data = { ...partialSettings, updatedAt: serverTimestamp() };
    
    if (data.map) {
        data.map.lastActTimestamp = serverTimestamp();
    }
    
    await setDoc(docRef, data, { merge: true });
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
