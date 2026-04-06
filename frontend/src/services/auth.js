import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from './firebase';
import { COLLECTIONS } from '../config/constants';
import { generateUUID } from '../utils/uuid';

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
        fingerprint = generateUUID();
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

/**
 * Register a new user with email/password (Admin registration flow).
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function registerWithEmail(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
}

/**
 * Call the setupRelationship Cloud Function after admin registration.
 * Generates relationshipId, partnerToken, creates placeholder partner + appConfig.
 * @param {string} adminUid
 * @returns {Promise<{ success: boolean, relationshipId: string, partnerToken: string }>}
 */
export async function callSetupRelationship(adminUid) {
    const fn = httpsCallable(functions, 'setupRelationship');
    const result = await fn({ adminUid });
    return result.data;
}

/**
 * Validate an invite token against appConfig/main.partnerToken.
 * Public — no auth required.
 * @param {string} token
 * @returns {Promise<{ valid: boolean, relationshipId: string }>}
 */
export async function callValidateInviteToken(token) {
    try {
        const fn = httpsCallable(functions, 'validateInviteToken');
        const result = await fn({ token });
        return result.data;
    } catch (error) {
        console.error('[AuthService] Validation failed:', error);
        throw error;
    }
}

/**
 * Claim a partner account using an invite token + chosen password.
 * Backend sets password, activates accountStatus, injects claims, returns customToken.
 * @param {string} token - The invite/partner token
 * @param {string} password - Password the partner wants to set
 * @returns {Promise<{ success: boolean, customToken: string, userId: string }>}
 */
export async function callClaimPartnerAccount(token, password) {
    const fn = httpsCallable(functions, 'claimPartnerAccount');
    const result = await fn({ token, password });
    return result.data;
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
// Repair & Sync
// ─────────────────────────────────────────────────────────────────────────────

/**
 * repairAuth — Self-healing call
 * 
 * Sincroniza claims (role, relationshipId) desde Firestore a Firebase Auth.
 */
export async function callRepairAuth() {
    try {
        const repair = httpsCallable(functions, 'repairAuth');
        const result = await repair();
        return result.data;
    } catch (error) {
        console.error('[AuthService] Repair failed:', error);
        throw error;
    }
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
        relationshipId: tokenResult.claims.relationshipId ?? null,
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
