import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { logger } from 'firebase-functions';

// ── GLOBAL OPTIONS ───────────────────────────────────────────────────────────
// Habilita CORS para todas las funciones (necesario para Vercel)
setGlobalOptions({ 
    region: 'us-central1',
    cors: true 
});
import fs from 'fs';
import path from 'path';

// 1. Initialize Firebase Admin
if (getApps().length === 0) {
    const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
    const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');

    if (isEmulator && fs.existsSync(serviceAccountPath)) {
        logger.info('[Firebase Admin] Initializing for Emulator with serviceAccountKey.json');
        try {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            initializeApp({
                credential: cert(serviceAccount),
                storageBucket: 'capsule-valentins-day.firebasestorage.app'
            });
        } catch (err) {
            logger.error('[Firebase Admin] Failed to initialize with serviceAccountKey.json:', err);
            initializeApp(); // Fallback
        }
    } else {
        /**
         * En producción (Cloud Functions), NO debemos pasar projectId manualmente si 
         * queremos evitar el error "Service Usage Consumer" (403 Forbidden).
         * initializeApp() detecta automáticamente el entorno del proyecto.
         */
        logger.info('[Firebase Admin] Initializing for Production (Auto-discovery/ADC)');
        initializeApp();
    }
}

// 2. Emulator configuration
if (process.env.FUNCTIONS_EMULATOR === 'true') {
    logger.info('[DEBUG] Running in Emulator. Setting CLOUD_TASKS_EMULATOR_HOST=localhost:9124');
    process.env.CLOUD_TASKS_EMULATOR_HOST = 'localhost:9124';
}

const ALLOWED_ORIGINS = [
    /localhost:\d+$/, 
    /127\.0\.0\.1:\d+$/,
    /0\.0\.0\.0:\d+$/,
    /\.web\.app$/,
    /\.firebaseapp\.com$/,
    'https://capsule-sooty.vercel.app'
];

setGlobalOptions({
    region: 'us-central1',
    cors: ALLOWED_ORIGINS,
    maxInstances: 10
});

/**
 * lazyOnCall — Wrapper para carga dinámica de funciones onCall.
 */
const lazyOnCall = (path, name) => onCall({ 
    cors: ALLOWED_ORIGINS
}, async (request) => {
    try {
        const mod = await import(path);
        const handler = mod.handler || (name ? mod[name] : null);
        
        if (!handler) {
            logger.error(`[lazyOnCall] Handler '${name}' or 'handler' not found in ${path}`);
            throw new HttpsError('internal', 'Endpoint logic not found.');
        }
        
        const result = await handler(request);
        return result || { success: true };
    } catch (err) {
        logger.error(`[lazyOnCall] Error in function ${name || 'unknown'}:`, {
            path,
            error: err.message,
            stack: err.stack,
            code: err.code
        });
        
        if (err instanceof HttpsError) throw err;
        if (err.code && typeof err.code === 'string') throw new HttpsError('internal', err.message || 'Internal logic error', err);
        throw new HttpsError('internal', err.message || 'Unexpected server error');
    }
});

// --- API Functions (HTTPS onCall) ---

export const createCapsule = lazyOnCall('./src/api/createCapsule.js', 'handler');
export const getCapsules = lazyOnCall('./src/api/getCapsules.js', 'handler');
export const openCapsule = lazyOnCall('./src/api/openCapsule.js', 'handler');
export const getAppConfig = lazyOnCall('./src/api/getAppConfig.js', 'handler');

export const createMemory = lazyOnCall('./src/api/createMemory.js', 'createMemory');
export const createSnapshot = lazyOnCall('./src/api/createSnapshot.js', 'handler');
export const exchangeInviteToken = lazyOnCall('./src/api/exchangeInviteToken.js', 'exchangeInviteToken');
export const findOrCreatePlace = lazyOnCall('./src/api/findOrCreatePlace.js', 'findOrCreatePlace');
export const generateInviteToken = lazyOnCall('./src/api/generateInviteToken.js', 'generateInviteToken');
export const getMemories = lazyOnCall('./src/api/getMemories.js', 'getMemories');
export const logActivity = lazyOnCall('./src/api/logActivity.js', 'logActivity');
export const markLogAsRead = lazyOnCall('./src/api/markLogAsRead.js', 'markLogAsRead');
export const setupRelationship = lazyOnCall('./src/api/setupRelationship.js', 'setupRelationship');
export const validateInviteToken = lazyOnCall('./src/api/validateInviteToken.js', 'validateInviteToken');
export const claimPartnerAccount = lazyOnCall('./src/api/claimPartnerAccount.js', 'claimPartnerAccount');
export const deleteCapsule = lazyOnCall('./src/api/deleteCapsule.js', 'deleteCapsule');
export const destroyCapsule = lazyOnCall('./src/api/destroyCapsule.js', 'destroyCapsule');
export const updateMemory = lazyOnCall('./src/api/updateMemory.js', 'updateMemory');
export const deleteMemory = lazyOnCall('./src/api/deleteMemory.js', 'deleteMemory');
export const getGallery = lazyOnCall('./src/api/getGallery.js', 'getGallery');
export const updateBingoSquare = lazyOnCall('./src/api/updateBingoSquare.js', 'updateBingoSquare');
export const getBingoSuggestions = lazyOnCall('./src/api/getBingoSuggestions.js', 'getBingoSuggestions');
export const getBingoBoard = lazyOnCall('./src/api/getBingoBoard.js', 'getBingoBoard');
export const updateBingoBoard = lazyOnCall('./src/api/updateBingoBoard.js', 'updateBingoBoard');
export const resetBingoBoard = lazyOnCall('./src/api/resetBingoBoard.js', 'resetBingoBoard');
export const createCoupon = lazyOnCall('./src/api/createCoupon.js', 'createCoupon');
export const updateCoupon = lazyOnCall('./src/api/updateCoupon.js', 'updateCoupon');
export const redeemCoupon = lazyOnCall('./src/api/redeemCoupon.js', 'redeemCoupon');
export const updateRedemptionStatus = lazyOnCall('./src/api/updateRedemptionStatus.js', 'updateRedemptionStatus');
export const getCoupons = lazyOnCall('./src/api/getCoupons.js', 'getCoupons');
export const getSnapshots = lazyOnCall('./src/api/getSnapshots.js', 'getSnapshots');
export const deleteSnapshot = lazyOnCall('./src/api/deleteSnapshot.js', 'deleteSnapshot');
export const markSnapshotAsSeen = lazyOnCall('./src/api/markSnapshotAsSeen.js', 'markSnapshotAsSeen');
export const updateAppConfig = lazyOnCall('./src/api/updateAppConfig.js', 'updateAppConfig');
export const revokePartner = lazyOnCall('./src/api/revokePartner.js', 'revokePartner');
export const getTeaserConfig = lazyOnCall('./src/api/getTeaserConfig.js', 'getTeaserConfig');
export const completeTeaser = lazyOnCall('./src/api/completeTeaser.js', 'completeTeaser');
export const getActivityLogs = lazyOnCall('./src/api/getActivityLogs.js', 'getActivityLogs');
export const repairAuth = lazyOnCall('./src/api/repairAuth.js', 'repairAuth');
export const ping = lazyOnCall('./src/api/ping.js', 'ping');

// --- Triggers (EXTREME LAZY LOADING - 2026-04-06) ---
// We keep the configs in index.js so Firebase can index them, 
// but we only import the actual logic when the event fires.

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

export const archiveExpiredSnapshots = onSchedule({
    schedule: 'every 6 hours',
    region: 'us-central1',
    timeZone: 'America/Mexico_City',
    retryCount: 3,
}, async (event) => {
    const mod = await import('./src/api/archiveExpiredSnapshots.js');
    return mod.archiveExpiredSnapshots(event);
});

export const onPhotoUploaded = onObjectFinalized({ 
    memory: '1GiB',
    timeoutSeconds: 300 
}, async (event) => {
    const mod = await import('./src/triggers/onPhotoUploaded.js');
    return mod.onPhotoUploaded(event);
});

export const onMemoryCreated = onDocumentCreated({
    document: 'memories/{memoryId}',
    region: 'us-central1'
}, async (event) => {
    const mod = await import('./src/triggers/onMemoryCreated.js');
    return mod.onMemoryCreated(event);
});

export const taskUnlockCapsule = onDocumentCreated({
    document: 'capsules/{capsuleId}',
    region: 'us-central1'
}, async (event) => {
    const mod = await import('./src/triggers/taskUnlockCapsule.js');
    return mod.taskUnlockCapsule(event);
});

export const taskArchiveSnapshot = onRequest({
    region: 'us-central1',
    invoker: 'private',
}, async (req, res) => {
    const mod = await import('./src/triggers/taskArchiveSnapshot.js');
    return mod.handler(req, res);
});

export const cleanupExpiredTokens = onSchedule({
    schedule: 'every 24 hours',
    region: 'us-central1'
}, async (event) => {
    const mod = await import('./src/triggers/cleanupExpiredTokens.js');
    return mod.cleanupExpiredTokens(event);
});

import { onDocumentWritten } from 'firebase-functions/v2/firestore';

export const onSnapshotCreated = onDocumentWritten({
    document: 'relationships/{relationshipId}/snapshots/{snapshotId}',
    region: 'us-central1',
    retry: true
}, async (event) => {
    const mod = await import('./src/triggers/onSnapshotCreated.js');
    return mod.onSnapshotCreatedHandler(event);
});


// ── Special Event Orchestrator ───────────────────────────────────────────────
// Architecture: zero polling, exact timing via Cloud Tasks.
//
//  scheduleSpecialEvent  (onCall)
//    └─ Admin calls this after saving an event in Firestore.
//    └─ Creates a one-shot Cloud Task scheduled for the exact unlockDateTime.
//
//  dispatchEventNow  (onRequest, private — Cloud Tasks only)
//    └─ Fires at the exact minute, sends FCM push, marks dispatchedAt.
// ─────────────────────────────────────────────────────────────────────────────

export const scheduleSpecialEvent = lazyOnCall('./src/api/scheduleSpecialEvent.js', 'handler');

export const dispatchEventNow = onRequest({
    region: 'us-central1',
    invoker: 'private', // Only Cloud Tasks (OIDC) can call this
}, async (req, res) => {
    const mod = await import('./src/api/dispatchEventNow.js');
    return mod.handler(req, res);
});
