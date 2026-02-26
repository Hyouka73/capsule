import { initializeApp } from 'firebase-admin/app';

// 1. Initialize Firebase Admin
initializeApp();

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

// --- Triggers ---
export { onPhotoUploaded } from './src/triggers/onPhotoUploaded.js';
export { taskUnlockCapsule } from './src/triggers/taskUnlockCapsule.js';

