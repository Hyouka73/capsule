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
            console.warn(`[API Client Warning] /${name} did not return a 'success' flag.`, result.data);
        }

        return result.data;
    } catch (error) {
        // Logueamos el error completo para debuggear en la consola del cliente
        console.error(`[API Client Error] /${name}:`, error);
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
