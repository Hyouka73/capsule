import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants.js';

/**
 * getBingoSuggestions — Backend API (BFF)
 * 
 * Retorna sugerencias de casillas del bingo basadas en tags proporcionados.
 * Ruta: relationships/{relationshipId}/bingo/board
 */
export const getBingoSuggestions = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { tags = [] } = request.data;
    const { relationshipId } = request.auth.token;

    if (!relationshipId) {
        throw new HttpsError('failed-precondition', 'Relationship ID missing in claims.');
    }

    const db = getFirestore();

    try {
        const boardsColl = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.BINGO_BOARD);
        const activeSnap = await boardsColl.where('status', '==', 'active').limit(1).get();

        let categories = [];
        if (!activeSnap.empty) {
            categories = activeSnap.docs[0].data().categories || [];
        } else {
            // Fallback for legacy documents
            const legacyDoc = await boardsColl.doc(SINGLETON_DOCS.BINGO_BOARD).get();
            if (legacyDoc.exists) {
                categories = legacyDoc.data().categories || [];
            }
        }

        if (categories.length === 0) {
              return { success: true, suggestions: [] };
        }

        // 1. Filtrar solo casillas no completadas y habilitadas
        const availableCategories = categories.filter(c => !c.completedMemoryId && c.isEnabled !== false);

        // 2. Si no hay tags, retornar listado de disponibles para selección manual (opcional)
        if (tags.length === 0) {
            return { 
                success: true, 
                suggestions: [],
                availableCategories: availableCategories.map(c => ({ id: c.id, title: c.title || c.label }))
            };
        }

        const normalizedTags = tags.map(t => t.toLowerCase().trim());

        // 3. Match logic: Strict AND logic (Memory must contain ALL suggested tags of the category)
        const suggestions = availableCategories.filter(cat => {
            const suggestedTags = cat.suggestedTags || [];
            if (suggestedTags.length === 0) return false;

            return suggestedTags.every(st => {
                const catTag = (typeof st === 'string' ? st : st.value).toLowerCase().trim();
                return normalizedTags.includes(catTag);
            });
        });

        return {
            success: true,
            suggestions: suggestions.map(s => ({
                categoryId: s.id,
                title: s.title || s.label,
                emoji: s.emoji,
                isSpecial: s.isSpecial || false
            })),
            availableCategoriesLength: availableCategories.length
        };

    } catch (error) {
        logger.error('getBingoSuggestions error:', { relationshipId, error: error.message });
        throw new HttpsError('internal', 'Error al obtener sugerencias de bingo.');
    }
});

