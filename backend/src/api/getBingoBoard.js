import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { relationshipId } = request.auth.token;
    if (!relationshipId) {
        throw new HttpsError('failed-precondition', 'El usuario no tiene una relación asignada.');
    }

    const db = getFirestore();

    try {
        const boardsColl = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.BINGO_BOARD);
        const activeSnap = await boardsColl.where('status', '==', 'active').limit(1).get();

        if (activeSnap.empty) {
            const legacyRef = boardsColl.doc('board');
            const legacySnap = await legacyRef.get();

            if (legacySnap.exists) {
                return { success: true, ...legacySnap.data() };
            }

            return { 
                success: true, 
                categories: [], 
                completedCount: 0, 
                totalCount: 16,
                status: 'active'
            };
        }

        const activeBoard = activeSnap.docs[0];
        return {
            success: true,
            id: activeBoard.id,
            ...activeBoard.data()
        };
    } catch (error) {
        logger.error('getBingoBoard error:', { relationshipId, error: error.message });
        throw new HttpsError('internal', 'Error al obtener el tablero de bingo.');
    }
};
