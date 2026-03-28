import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

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
        const boardRef = db.doc(`relationships/${relationshipId}/bingo/board`);
        const boardSnap = await boardRef.get();

        if (!boardSnap.exists) {
              return { success: true, suggestions: [] };
        }

        const { categories = [] } = boardSnap.data();
        
        // 1. Filtrar solo casillas no completadas
        const availableCategories = categories.filter(c => !c.completedMemoryId && c.isEnabled !== false);

        // 2. Si no hay tags, retornar un subconjunto de disponibles (o vacío)
        if (tags.length === 0) {
            return { 
                success: true, 
                suggestions: [],
                availableCategories: availableCategories.map(c => ({ id: c.id, title: c.title || c.label }))
            };
        }

        const normalizedTags = tags.map(t => t.toLowerCase().trim());

        // 3. Match logic
        const suggestions = availableCategories.filter(cat => {
            const catTags = (cat.suggestedTags || []).map(st => 
                (typeof st === 'string' ? st : st.value).toLowerCase().trim()
            );
            return normalizedTags.some(t => catTags.includes(t));
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
