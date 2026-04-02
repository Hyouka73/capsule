import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');
    
    const { boardData } = request.data || {};
    const { relationshipId, role } = request.auth.token;

    // All members in the relationship can update the board
    if (!relationshipId) throw new HttpsError('failed-precondition', 'No relationship found.');

    const db = getFirestore();
    const boardRef = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.BINGO_BOARD).doc('board');

    try {
        await boardRef.update({
            ...boardData,
            updatedAt: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        logger.error('updateBingoBoard error:', error);
        throw new HttpsError('internal', error.message);
    }
};
