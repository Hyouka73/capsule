import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');
    
    const { relationshipId } = request.auth.token;
    const { categoryId } = request.data || {};

    if (!relationshipId) throw new HttpsError('failed-precondition', 'No relationship found.');

    const db = getFirestore();
    const suggestionsRef = db.collection('bingo_suggestions');

    try {
        let query = suggestionsRef;
        if (categoryId) {
            query = query.where('categoryId', '==', categoryId);
        }

        const snapshot = await query.get();
        const suggestions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return { 
            success: true, 
            suggestions
        };
    } catch (error) {
        logger.error('getBingoSuggestions error:', error);
        throw new HttpsError('internal', error.message);
    }
};
