import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';


/**
 * Llama a una función Serverless del Backend (BFF).
 * Centraliza el manejo de errores y la inyección de token.
 * 
 * @param {string} name - Nombre de la Cloud Function exportada en backend/index.js
 * @param {object} data - Datos JSON a enviar (payload)
 * @returns {Promise<any>} Respuesta del servidor
 */
export async function callBackendApi(name, data = {}) {
    try {
        const callable = httpsCallable(functions, name);
        const result = await callable(data);

        // Si el backend explicitamente dice success: false, lanzamos el error que mandó
        if (result.data && result.data.success === false) {
            throw new Error(result.data.error || 'API Error.');
        }

        // Si no trae la bandera success pero tampoco dio error, logueamos un warning
        // pero permitimos que pase (para no romper compatibilidad hacia atrás).
        if (result.data && typeof result.data.success === 'undefined') {
            // silent warn
        }

        return result.data;
    } catch (error) {
        // Logueamos el error completo para debuggear en la consola del cliente
        // error logged silently
        throw error;
    }
}

// Wrappers tipados para la UI (Frontend ya no toca Firestore, solo llama al backend)

export function createMemory(payload) {
    return callBackendApi('createMemory', payload);
}

export function logActivity(payload) {
    return callBackendApi('logActivity', payload);
}

export function registerExercise(payload) {
    return callBackendApi('registerExercise', payload);
}

export function findOrCreatePlace(payload) {
    return callBackendApi('findOrCreatePlace', payload);
}

export function getMemories(payload) {
    return callBackendApi('getMemories', payload);
}

export function createCapsule(payload) {
    return callBackendApi('createCapsule', payload);
}

export function openCapsule(payload) {
    return callBackendApi('openCapsule', payload);
}

export function getCapsules(payload) {
    return callBackendApi('getCapsules', payload);
}

export function deleteCapsule(payload) {
    return callBackendApi('deleteCapsule', payload);
}

export function updateMemory(payload) {
    return callBackendApi('updateMemory', payload);
}

export function deleteMemory(payload) {
    return callBackendApi('deleteMemory', payload);
}

export function createSnapshot(payload) {
    return callBackendApi('createSnapshot', payload);
}

export function generateInviteToken(payload) {
    return callBackendApi('generateInviteToken', payload);
}

export function getGallery(payload) {
    return callBackendApi('getGallery', payload);
}

export function updateBingoSquare(payload) {
    return callBackendApi('updateBingoSquare', payload);
}

export function updateBingoBoard(payload) {
    return callBackendApi('updateBingoBoard', payload);
}

export function resetBingoBoard(payload) {
    return callBackendApi('resetBingoBoard', payload);
}

export function getBingoBoard(payload) {
    return callBackendApi('getBingoBoard', payload);
}

export function getBingoSuggestions(payload) {
    return callBackendApi('getBingoSuggestions', payload);
}

export function createCoupon(payload) {
    return callBackendApi('createCoupon', payload);
}

export function updateCoupon(payload) {
    return callBackendApi('updateCoupon', payload);
}

export function redeemCoupon(payload) {
    return callBackendApi('redeemCoupon', payload);
}

export function updateRedemptionStatus(payload) {
    return callBackendApi('updateRedemptionStatus', payload);
}

export function getCoupons(payload) {
    return callBackendApi('getCoupons', payload);
}

export function getSnapshots(payload) {
    return callBackendApi('getSnapshots', payload);
}

export function deleteSnapshot(payload) {
    return callBackendApi('deleteSnapshot', payload);
}

export function markSnapshotAsSeen(payload) {
    return callBackendApi('markSnapshotAsSeen', payload);
}

export function getAppConfig(payload) {
    return callBackendApi('getAppConfig', payload);
}

export function updateAppConfig(payload) {
    return callBackendApi('updateAppConfig', payload);
}

export function revokePartner(payload) {
    return callBackendApi('revokePartner', payload);
}

export function getTeaserConfig(payload) {
    return callBackendApi('getTeaserConfig', payload);
}

export function completeTeaser(payload) {
    return callBackendApi('completeTeaser', payload);
}

export function getActivityLogs(payload) {
    return callBackendApi('getActivityLogs', payload);
}

export function markLogAsRead(payload) {
    return callBackendApi('markLogAsRead', payload);
}

