import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');
    
    const { relationshipId } = request.auth.token;

    // All members in the relationship can reset the board
    if (!relationshipId) throw new HttpsError('failed-precondition', 'No relationship found.');

    const db = getFirestore();
    const boardRef = db.collection('relationships')
        .doc(relationshipId)
        .collection(COLLECTIONS.BINGO_BOARD)
        .doc(SINGLETON_DOCS.BINGO_BOARD);

    try {
        await db.runTransaction(async (transaction) => {
            const boardSnap = await transaction.get(boardRef);
            if (!boardSnap.exists) throw new HttpsError('not-found', 'Bingo board not found.');

            const data = boardSnap.data();
            const currentCategories = data.categories || [];

            // Reset all categories but keep IDs and titles
            const resetCategories = currentCategories.map(cat => ({
                ...cat,
                isCompleted: false,
                completedMemoryId: null,
                completedAt: null
            }));

            transaction.update(boardRef, {
                categories: resetCategories,
                status: 'active', // Should stay active for next round
                completedCount: 0,
                updatedAt: FieldValue.serverTimestamp()
            });
        });

        return { success: true };
    } catch (error) {
        logger.error('resetBingoBoard error:', error.message);
        throw new HttpsError('internal', error.message);
    }
};
