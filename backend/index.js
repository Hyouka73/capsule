import { initializeApp, getApps } from 'firebase-admin/app';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

// 1. Initialize Firebase Admin (Static config, emulators are handled by SDK automatically)
if (getApps().length === 0) {
    initializeApp({
        projectId: 'capsule-valentins-day'
    });
}

/**
 * PROJECT CAPSULE - Cloud Functions Entry Point (Optimized for v2 Discovery)
 * 
 * Usamos importación dinámica dentro de los handlers para reducir el tiempo de carga
 * inicial (especialmente crítico en entornos lentos como OneDrive/Windows).
 * Esto evita el "Timeout after 10000" del emulador y resuelve los errores de CORS.
 */

const lazyOnCall = (path, name) => onCall({ region: 'us-central1', cors: true }, async (request) => {
    try {
        const mod = await import(path);
        const handler = mod.handler || (name ? mod[name] : null);
        
        if (!handler) {
            logger.error(`[lazyOnCall] Handler '${name}' or 'handler' not found in ${path}`);
            throw new HttpsError('internal', 'Endpoint logic not found.');
        }
        
        return await handler(request);
    } catch (err) {
        logger.error(`[lazyOnCall] Error in ${name || 'anonymous'} @ ${path}:`, err);
        
        // If it's already an HttpsError, rethrow it
        if (err.code && err.message && typeof err.code === 'string') {
             throw err;
        }
        
        // Otherwise wrap it in an HttpsError to ensure CORS headers are sent correctly
        throw new HttpsError('internal', err.message || 'Internal server error');
    }
});

// --- API Functions (HTTPS onCall) ---
export const createCapsule = lazyOnCall('./src/api/createCapsule.js', 'createCapsule');
export const createMemory = lazyOnCall('./src/api/createMemory.js', 'createMemory');
export const createSnapshot = lazyOnCall('./src/api/createSnapshot.js', 'createSnapshot');
export const exchangeInviteToken = lazyOnCall('./src/api/exchangeInviteToken.js', 'exchangeInviteToken');
export const findOrCreatePlace = lazyOnCall('./src/api/findOrCreatePlace.js', 'findOrCreatePlace');
export const generateInviteToken = lazyOnCall('./src/api/generateInviteToken.js', 'generateInviteToken');
export const getCapsules = lazyOnCall('./src/api/getCapsules.js', 'getCapsules');
export const getMemories = lazyOnCall('./src/api/getMemories.js', 'getMemories');
export const logActivity = lazyOnCall('./src/api/logActivity.js', 'logActivity');
export const markLogAsRead = lazyOnCall('./src/api/markLogAsRead.js', 'markLogAsRead');
export const openCapsule = lazyOnCall('./src/api/openCapsule.js', 'openCapsule');
export const setupRelationship = lazyOnCall('./src/api/setupRelationship.js', 'setupRelationship');
export const validateInviteToken = lazyOnCall('./src/api/validateInviteToken.js', 'validateInviteToken');
export const claimPartnerAccount = lazyOnCall('./src/api/claimPartnerAccount.js', 'claimPartnerAccount');
export const unlockScheduledCapsules = lazyOnCall('./src/api/unlockScheduledCapsules.js', 'unlockScheduledCapsules');
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
export const getAppConfig = lazyOnCall('./src/api/getAppConfig.js', 'getAppConfig');
export const updateAppConfig = lazyOnCall('./src/api/updateAppConfig.js', 'updateAppConfig');
export const revokePartner = lazyOnCall('./src/api/revokePartner.js', 'revokePartner');
export const getTeaserConfig = lazyOnCall('./src/api/getTeaserConfig.js', 'getTeaserConfig');
export const completeTeaser = lazyOnCall('./src/api/completeTeaser.js', 'completeTeaser');
export const getActivityLogs = lazyOnCall('./src/api/getActivityLogs.js', 'getActivityLogs');
export const ping = lazyOnCall('./src/api/ping.js', 'ping');

// --- Triggers ---
// Nota: Los triggers (onDocumentCreated, etc.) se mantienen estáticos si son pocos,
// pero si causan timeout también pueden envolverse. Por ahora los dejamos así:
export { archiveExpiredSnapshots } from './src/api/archiveExpiredSnapshots.js';
export { onPhotoUploaded } from './src/triggers/onPhotoUploaded.js';
export { onMemoryCreated } from './src/triggers/onMemoryCreated.js';
export { taskUnlockCapsule } from './src/triggers/taskUnlockCapsule.js';
export { taskArchiveSnapshot } from './src/triggers/taskArchiveSnapshot.js';
export { cleanupExpiredTokens } from './src/triggers/cleanupExpiredTokens.js';
