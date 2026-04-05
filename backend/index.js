import { initializeApp, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { logger } from 'firebase-functions';

// 1. Initialize Firebase Admin
if (getApps().length === 0) {
    initializeApp({
        projectId: 'capsule-valentins-day',
        storageBucket: 'capsule-valentins-day.firebasestorage.app'
    });
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
 * TEMPORARY: setStorageCors
 * Configures the Storage bucket to allow direct photo downloads on Android.
 * This function can be called once via its URL after deployment.
 */
export const setStorageCors = onRequest({ cors: true }, async (req, res) => {
    try {
        const bucket = getStorage().bucket('capsule-valentins-day.firebasestorage.app');
        
        const corsConfiguration = [
            {
                origin: ['*'], 
                method: ['GET', 'HEAD', 'OPTIONS'],
                maxAgeSeconds: 3600,
                responseHeader: [
                    'Content-Type', 
                    'Access-Control-Allow-Origin', 
                    'Authorization'
                ]
            }
        ];

        logger.info(`[CORS] Attempting to set config on bucket: ${bucket.name}`);
        await bucket.setCorsConfiguration(corsConfiguration);
        
        logger.info('[CORS] SUCCESS: Configuration applied.');
        res.status(200).send('✅ Firebase Storage CORS updated successfully! You can now delete this function and use the "Save" button in the gallery.');
    } catch (error) {
        logger.error('[CORS] FAILED:', error);
        res.status(500).send(`❌ Error setting CORS: ${error.message}`);
    }
});

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
import { handler as createCapsuleHandler } from './src/api/createCapsule.js';
import { handler as getCapsulesHandler } from './src/api/getCapsules.js';
import { handler as openCapsuleHandler } from './src/api/openCapsule.js';
import { handler as getAppConfigHandler } from './src/api/getAppConfig.js';

export const createCapsule = onCall({ cors: ALLOWED_ORIGINS }, createCapsuleHandler);
export const getCapsules = onCall({ cors: ALLOWED_ORIGINS }, getCapsulesHandler);
export const openCapsule = onCall({ cors: ALLOWED_ORIGINS }, openCapsuleHandler);
export const getAppConfig = onCall({ cors: ALLOWED_ORIGINS }, getAppConfigHandler);

export const createMemory = lazyOnCall('./src/api/createMemory.js', 'createMemory');
export const createSnapshot = lazyOnCall('./src/api/createSnapshot.js', 'createSnapshot');
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
