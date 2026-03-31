import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants.js';

/**
 * updateBingoBoard — Admin-only API
 * 
 * Actualiza la configuración completa del tablero de bingo.
 * Ruta: relationships/{relationshipId}/bingo/board
 */
export const updateBingoBoard = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { role, relationshipId } = request.auth.token;
    if (role !== 'admin') {
        throw new HttpsError('permission-denied', 'Solo el Admin puede configurar el tablero.');
    }

    const { categories } = request.data;
    if (!Array.isArray(categories)) {
        throw new HttpsError('invalid-argument', 'El campo categories debe ser un array.');
    }

    const db = getFirestore();

    try {
        const boardRef = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.BINGO_BOARD).doc(SINGLETON_DOCS.BINGO_BOARD);
        
        await boardRef.set({
            status: 'active',
            categories,
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        return {
            success: true,
            message: 'Tablero actualizado correctamente.'
        };
    } catch (error) {
        logger.error('updateBingoBoard error:', { relationshipId, error: error.message });
        throw new HttpsError('internal', 'Error al actualizar el tablero de bingo.');
    }
});

