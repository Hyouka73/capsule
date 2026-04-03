import { initializeApp, getApps } from 'firebase-admin/app';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { logger } from 'firebase-functions';

// 1. Initialize Firebase Admin
if (getApps().length === 0) {
    initializeApp({
        projectId: 'capsule-valentins-day'
    });
}

// 2. Configuración de Emuladores para Cloud Tasks
// Si estamos en el emulador, necesitamos apuntar al host local de tasks.
if (process.env.FUNCTIONS_EMULATOR === 'true') {
    logger.info('[DEBUG] Running in Emulator. Setting CLOUD_TASKS_EMULATOR_HOST=localhost:9124');
    process.env.CLOUD_TASKS_EMULATOR_HOST = 'localhost:9124';
}

/**
 * GLOBAL CONFIGURATION (v2)
 * Se aplica a todas las funciones exportadas si no se sobreescribe.
 */
setGlobalOptions({
    region: 'us-central1',
    cors: true, // Esto habilita el soporte global para CORS (vía middleware interno de onCall)
    maxInstances: 10
});

/**
 * lazyOnCall — Wrapper para carga dinámica de funciones.
 * 
 * Usamos una configuración de CORS más explícita para el entorno de desarrollo
 * y el emulador para evitar errores de preflight (OPTIONS).
 */
const lazyOnCall = (path, name) => onCall({ 
    // Mantenemos cors: true pero añadimos más seguridad en el manejo de errores
    // ya que un error no capturado/mal devuelto en v2 rompe las cabeceras CORS.
    cors: true 
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
        // ERROR LOGGING CRÍTICO
        logger.error(`[lazyOnCall] Error in function ${name || 'unknown'}:`, {
            path,
            error: err.message,
            stack: err.stack,
            code: err.code
        });
        
        // REGLA DE ORO DE CORS EN FUNCTIONS:
        // Todas las respuestas DEBEN ser HttpsError para que el SDK v2 
        // pueda inyectar las cabeceras CORS correctamente en la respuesta de error.
        
        if (err instanceof HttpsError) {
             throw err;
        }

        // Si es un error con código pero no es HttpsError (ej: Firestore)
        if (err.code && typeof err.code === 'string') {
            // Intentamos mapear códigos comunes o simplemente envolverlo
            throw new HttpsError('internal', err.message || 'Internal logic error', err);
        }
        
        // Fallback genérico
        throw new HttpsError('internal', err.message || 'Unexpected server error');
    }
});

// --- API Functions (HTTPS onCall) ---
import { handler as createCapsuleHandler } from './src/api/createCapsule.js';
import { handler as getCapsulesHandler } from './src/api/getCapsules.js';
import { handler as openCapsuleHandler } from './src/api/openCapsule.js';
import { handler as getAppConfigHandler } from './src/api/getAppConfig.js';

export const createCapsule = onCall({ cors: true }, createCapsuleHandler);
export const getCapsules = onCall({ cors: true }, getCapsulesHandler);
export const openCapsule = onCall({ cors: true }, openCapsuleHandler);
export const getAppConfig = onCall({ cors: true }, getAppConfigHandler);

// Mantener lazyOnCall solo para el resto para no sobrecargar el inicio físico
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
export const ping = lazyOnCall('./src/api/ping.js', 'ping');

// --- Triggers ---
export { archiveExpiredSnapshots } from './src/api/archiveExpiredSnapshots.js';
export { onPhotoUploaded } from './src/triggers/onPhotoUploaded.js';
export { onMemoryCreated } from './src/triggers/onMemoryCreated.js';
export { taskUnlockCapsule } from './src/triggers/taskUnlockCapsule.js';
export { taskArchiveSnapshot } from './src/triggers/taskArchiveSnapshot.js';
export { cleanupExpiredTokens } from './src/triggers/cleanupExpiredTokens.js';

