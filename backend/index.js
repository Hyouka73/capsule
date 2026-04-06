import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { logger } from 'firebase-functions';
import fs from 'fs';
import path from 'path';

// 1. Initialize Firebase Admin
if (getApps().length === 0) {
    const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
    const config = {
        projectId: 'capsule-valentins-day',
        storageBucket: 'capsule-valentins-day.firebasestorage.app'
    };

    if (fs.existsSync(serviceAccountPath)) {
        logger.info('[Firebase Admin] Initializing with serviceAccountKey.json');
        try {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            config.credential = cert(serviceAccount);
        } catch (err) {
            logger.error('[Firebase Admin] Failed to parse serviceAccountKey.json:', err);
        }
    } else {
        logger.info('[Firebase Admin] Initializing with default credentials');
    }

    initializeApp(config);
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

// --- Triggers ---
export { archiveExpiredSnapshots } from './src/api/archiveExpiredSnapshots.js';
export { onPhotoUploaded } from './src/triggers/onPhotoUploaded.js';
export { onMemoryCreated } from './src/triggers/onMemoryCreated.js';
export { taskUnlockCapsule } from './src/triggers/taskUnlockCapsule.js';
export { taskArchiveSnapshot } from './src/triggers/taskArchiveSnapshot.js';
export { cleanupExpiredTokens } from './src/triggers/cleanupExpiredTokens.js';
export { onSnapshotCreated } from './src/triggers/onSnapshotCreated.js';
