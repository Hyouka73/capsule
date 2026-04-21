import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');
    
    let { boardData, boardId } = request.data || {};
    
    // Robustness: if categories are found directly in the payload, use them
    if (!boardData && request.data?.categories) {
        boardData = { categories: request.data.categories };
    }
    const { relationshipId } = request.auth.token;

    if (!relationshipId) throw new HttpsError('failed-precondition', 'No relationship found.');

    const db = getFirestore();
    const boardsColl = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.BINGO_BOARD);

    try {
        let boardRef;
        
        // 1. Si enviaron un ID específico, usarlo
        if (boardId) {
            boardRef = boardsColl.doc(boardId);
        } else {
            // 2. Si no enviarion ID, buscar el tablero activo (igual que getBingoBoard)
            const activeSnap = await boardsColl.where('status', '==', 'active').limit(1).get();
            if (!activeSnap.empty) {
                boardRef = activeSnap.docs[0].ref;
            } else {
                // 3. Fallback a 'board' (legacy/singleton)
                boardRef = boardsColl.doc('board');
            }
        }

        await boardRef.update({
            ...boardData,
            updatedAt: FieldValue.serverTimestamp()
        });

        return { success: true, boardId: boardRef.id };
    } catch (error) {
        logger.error('updateBingoBoard error:', error);
        throw new HttpsError('internal', error.message);
    }
};
