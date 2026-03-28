import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * resetBingoBoard — Backend API (BFF)
 * 
 * Resetea el tablero de bingo y archiva el actual en bingoHistory.
 * Ruta: relationships/{relationshipId}/bingo/board
 */
export const resetBingoBoard = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { relationshipId, uid, role } = request.auth.token;
    if (role !== 'admin') {
        throw new HttpsError('permission-denied', 'Solo el Admin puede resetear el tablero.');
    }

    const db = getFirestore();
    const boardsColl = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.BINGO_BOARD);

    try {
        return await db.runTransaction(async (transaction) => {
            const activeSnap = await transaction.get(boardsColl.where('status', '==', 'active').limit(1));
            
            if (activeSnap.empty) {
                throw new HttpsError('not-found', 'No hay un tablero activo para resetear.');
            }

            const activeBoardRef = activeSnap.docs[0].ref;
            const boardData = activeSnap.docs[0].data();

            // 1. Mark Current as Completed
            transaction.update(activeBoardRef, {
                status: 'completed',
                completedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
            });

            // 2. Create NEW Active Board
            const newBoardRef = boardsColl.doc();
            const resetCats = (boardData.categories || []).map(c => ({
                ...c,
                completedMemoryId: null,
                completedAt: null
            }));

            transaction.set(newBoardRef, {
                categories: resetCats,
                completedCount: 0,
                totalCount: boardData.totalCount || 16,
                status: 'active',
                level: (boardData.level || 1) + 1,
                relationshipId,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
            });

            return {
                success: true,
                message: 'Tablero archivado y nuevo nivel generado.'
            };
        });
    } catch (error) {
        logger.error('resetBingoBoard error:', { relationshipId, error: error.message });
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Error al resetear el tablero.');
    }
});
