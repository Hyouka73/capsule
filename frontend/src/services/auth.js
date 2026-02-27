import {
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db, functions } from './firebase';
import { COLLECTIONS } from '../config/constants';

// ─────────────────────────────────────────────────────────────────────────────
// Device Fingerprint
// ─────────────────────────────────────────────────────────────────────────────

const DEVICE_FINGERPRINT_KEY = 'capsule_device_id';

/**
 * Get (or lazily create) a stable device fingerprint stored in localStorage.
 * This persists across browser sessions and is only cleared if the user
 * manually clears site data.
 * @returns {string} UUID v4
 */
export function generateDeviceFingerprint() {
    let fingerprint = localStorage.getItem(DEVICE_FINGERPRINT_KEY);
    if (!fingerprint) {
        fingerprint = crypto.randomUUID();
        localStorage.setItem(DEVICE_FINGERPRINT_KEY, fingerprint);
    }
    return fingerprint;
}

/**
 * Get the stored device fingerprint without creating one.
 * @returns {string|null}
 */
export function getStoredDeviceFingerprint() {
    return localStorage.getItem(DEVICE_FINGERPRINT_KEY);
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Auth
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sign in as admin using email/password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function signInAsAdmin(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

// ─────────────────────────────────────────────────────────────────────────────
// Partner Auth (Custom Token flow)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exchange an invite token for a Firebase Custom Token.
 * Calls the `exchangeInviteToken` Cloud Function (HTTPS Callable).
 *
 * NOTE: This stub will work once Cloud Functions are deployed.
 * During local development without Functions, use the mock below.
 *
 * @param {string} inviteToken - The UUID from the invite URL (?t=...)
 * @param {string} deviceFingerprint - The device UUID from localStorage
 * @returns {Promise<{ customToken: string, userId: string }>}
 */
export async function exchangeInviteToken(inviteToken, deviceFingerprint) {
    const exchange = httpsCallable(functions, 'exchangeInviteToken');
    const result = await exchange({ token: inviteToken, deviceFingerprint });
    return result.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Token Claims
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the current user's custom claims from their ID token.
 * Forces a refresh to ensure claims are up-to-date.
 *
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<{ role: string|null, deviceId: string|null }>}
 */
export async function getCurrentUserClaims(forceRefresh = false) {
    const currentUser = auth.currentUser;
    if (!currentUser) return { role: null, deviceId: null };

    const tokenResult = await currentUser.getIdTokenResult(forceRefresh);
    return {
        role: tokenResult.claims.role ?? null,
        deviceId: tokenResult.claims.deviceId ?? null,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Session Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update the user's lastActiveAt timestamp in Firestore.
 * Called on every session start. Fails silently (non-critical).
 * @param {string} userId
 */
export async function updateLastActiveAt(userId) {
    try {
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        await updateDoc(userRef, {
            lastActiveAt: serverTimestamp(),
        });
    } catch {
        // Non-critical — ignore failures (e.g. offline)
    }
}

/**
 * Sign out the current user (works for both admin and partner).
 * @returns {Promise<void>}
 */
export async function signOut() {
    return firebaseSignOut(auth);
}
