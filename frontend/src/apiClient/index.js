import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../services/firebase';

const functions = getFunctions(app, 'us-central1');

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

        if (!result.data.success) {
            throw new Error(result.data.error || 'API Error.');
        }

        return result.data;
    } catch (error) {
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
