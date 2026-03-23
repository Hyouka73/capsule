import { initializeApp } from 'firebase-admin/app';

// 1. Initialize Firebase Admin
if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV === 'development') {
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';
    process.env.GCLOUD_PROJECT = 'capsule-valentins-day'; // Force project ID
    console.log('[Backend] Forcing Emulator Hosts and Project ID:', {
        firestore: process.env.FIRESTORE_EMULATOR_HOST,
        auth: process.env.FIREBASE_AUTH_EMULATOR_HOST,
        project: process.env.GCLOUD_PROJECT
    });
}

initializeApp({
    projectId: 'capsule-valentins-day'
});

/**
 * PROJECT CAPSULE - Cloud Functions Entry Point
 * Firebase Functions v6 (v2 SDK) + ES Modules
 */

// --- API Functions (HTTPS onCall) ---
export { createCapsule } from './src/api/createCapsule.js';
export { createMemory } from './src/api/createMemory.js';
export { createSnapshot } from './src/api/createSnapshot.js';
export { exchangeInviteToken } from './src/api/exchangeInviteToken.js';
export { findOrCreatePlace } from './src/api/findOrCreatePlace.js';
export { generateInviteToken } from './src/api/generateInviteToken.js';
export { getCapsules } from './src/api/getCapsules.js';
export { getMemories } from './src/api/getMemories.js';
export { logActivity } from './src/api/logActivity.js';
export { openCapsule } from './src/api/openCapsule.js';
export { unlockScheduledCapsules } from './src/api/unlockScheduledCapsules.js';
export { updateMemory } from './src/api/updateMemory.js';
export { deleteMemory } from './src/api/deleteMemory.js';
export { getGallery } from './src/api/getGallery.js';

// --- Triggers ---
export { archiveExpiredSnapshots } from './src/api/archiveExpiredSnapshots.js';
export { onPhotoUploaded } from './src/triggers/onPhotoUploaded.js';
export { taskUnlockCapsule } from './src/triggers/taskUnlockCapsule.js';
export { taskArchiveSnapshot } from './src/triggers/taskArchiveSnapshot.js';

