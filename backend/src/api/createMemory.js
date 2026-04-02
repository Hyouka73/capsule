import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS, SINGLETON_DOCS, ACTIVITY_ACTIONS } from '../config/constants.js';
import { logActivity } from '../services/activityService.js';

/**
 * createMemory API - Solo para usuarios autenticados (Admin o Partner)
 * Valida los datos y maneja la escritura en Firestore de forma segura.
 */
export const handler = async (request) => {
    // 1. Verificar autenticación
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes iniciar sesión para crear un recuerdo.');
    }

    const { uid } = request.auth;
    const rawPlaceId = request.data.placeId;
    const placeId = (rawPlaceId && rawPlaceId !== 'custom_map') ? rawPlaceId : null;
    const { id, title, description, eventDate, tags, adminNotes, placeName, placeLat, placeLng } = request.data;

    // 2. Validación básica de Payload
    if (!eventDate) {
        throw new HttpsError('invalid-argument', 'El campo eventDate es obligatorio.');
    }

    const db = getFirestore();

    const relationshipId = request.auth.token.relationshipId;
    if (!relationshipId) {
        throw new HttpsError('failed-precondition', 'El usuario no tiene una relación asignada.');
    }

    // 3. Preparar el mapping de entidad para Firestore
    const memoryData = {
        title: title || 'Recuerdo sin título',
        description: description || null,
        eventDate: new Date(eventDate),
        tags: Array.isArray(tags) ? tags : [],
        adminNotes: adminNotes || null,
        placeId: placeId || null,
        placeName: placeName || null,
        placeLat: placeLat ? parseFloat(placeLat) : null,
        placeLng: placeLng ? parseFloat(placeLng) : null,
        relationshipId, // Aislación por relación
        uploadedBy: uid,
        photoCount: 0,
        mainPhotoUrl: null,
        isSpecial: false,
        isHidden: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    try {
        // 4. Escribir a DB desde el lado del servidor
        // USAR SUBCOLECCIÓN: relationships/{relationshipId}/memories/{id}
        const relationshipRef = db.collection('relationships').doc(relationshipId);
        const memoryRef = id ? relationshipRef.collection(COLLECTIONS.MEMORIES).doc(id) : relationshipRef.collection(COLLECTIONS.MEMORIES).doc();
        const memoryId = memoryRef.id;

        const { offlinePhotoUrls = [] } = request.data;
        let photoCount = 0;
        let mainPhotoUrl = null;

        if (offlinePhotoUrls.length > 0) {
            // Priority: Explicit isMain flag, or fall back to first photo
            const mainPhoto = offlinePhotoUrls.find(p => p.isMain) || offlinePhotoUrls[0];
            
            // Use thumbUrl for mainPhotoUrl if available (optimized for map/list)
            mainPhotoUrl = mainPhoto.thumbUrl || mainPhoto.url;
            photoCount = offlinePhotoUrls.length;
        }

        // SEGUNDO: Crear el documento padre (Memory)
        await memoryRef.set({
            ...memoryData,
            photoCount: photoCount, // Set initial count
            mainPhotoUrl: mainPhotoUrl,
        });

        // TERCERO: Crear los documentos de fotos en Batch
        if (offlinePhotoUrls.length > 0) {
            const batch = db.batch();
            offlinePhotoUrls.forEach((p) => {
                const photoId = p.photoId || db.collection('dummy').doc().id;
                const photoRef = memoryRef.collection(COLLECTIONS.PHOTOS).doc(photoId);

                batch.set(photoRef, {
                    url: p.url,
                    thumbUrl: p.thumbUrl || null,
                    storagePath: p.storagePath,
                    isMain: !!p.isMain,
                    uploadStatus: 'completed',
                    isSnapshot: false,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
            });
            await batch.commit();
        }

        // 5. Incrementar visitCount del lugar si existe (Específico por relación)
        if (memoryData.placeId) {
            try {
                const placeRef = db.collection(COLLECTIONS.PLACES).doc(memoryData.placeId);
                await db.runTransaction(async (transaction) => {
                    const placeSnap = await transaction.get(placeRef);
                    if (!placeSnap.exists) return;

                    const placeData = placeSnap.data();
                    const vBy = placeData.visitedBy || [];
                    const vIndex = vBy.findIndex(v => v.relationshipId === relationshipId);
                    
                    let updatedVisitedBy = [...vBy];
                    if (vIndex !== -1) {
                        updatedVisitedBy[vIndex] = {
                            ...updatedVisitedBy[vIndex],
                            count: (updatedVisitedBy[vIndex].count || 0) + 1,
                            timestamp: new Date().toISOString()
                        };
                    } else {
                        updatedVisitedBy.push({
                            relationshipId,
                            count: 1,
                            timestamp: new Date().toISOString()
                        });
                    }

                    const updates = {
                        visitedBy: updatedVisitedBy,
                        updatedAt: FieldValue.serverTimestamp()
                    };

                    if (!placeData.visitedByRelationshipIds?.includes(relationshipId)) {
                        updates.visitedByRelationshipIds = FieldValue.arrayUnion(relationshipId);
                    }

                    transaction.update(placeRef, updates);
                });
            } catch (placeErr) {
                logger.warn(`Could not update visitCount for place ${memoryData.placeId}:`, placeErr);
            }
        }

        // 6. Bingo Autodetection - Standardized for multiple boards & status: 'active'
        let bingoSuggestions = [];
        try {
            const boardsColl = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.BINGO_BOARD);
            const activeSnap = await boardsColl.where('status', '==', 'active').limit(1).get();

            if (!activeSnap.empty) {
                const bingoDoc = activeSnap.docs[0];
                const categories = bingoDoc.data().categories || [];
                const memoryTagsLower = (memoryData.tags || []).map(t => t.toLowerCase().trim());
                
                bingoSuggestions = categories
                    .filter(cat => {
                        if (cat.completedMemoryId || cat.isEnabled === false) return false;
                        
                        // Detection Logic:
                        // 1. Direct ID match: memory.tags includes this category's own ID
                        const isIdMatch = memoryTagsLower.includes(cat.id.toLowerCase());

                        // 2. Suggested Tag IDs match: memory has ANY suggested tag ID of this category
                        // suggestedTags format: [{ id: 'tag_cita' }, { id: 'tag_cine' }]
                        const suggestedTags = cat.suggestedTags || [];
                        const hasTagIdMatch = suggestedTags.length > 0 && suggestedTags.some(st => {
                            // New format: { id: 'tag_cine' }
                            if (st.id) return memoryTagsLower.includes(st.id.toLowerCase());
                            // Legacy format fallback: { value: 'cine', label: '...' }
                            if (st.value) return memoryTagsLower.includes(st.value.toLowerCase().trim());
                            // Raw string fallback
                            if (typeof st === 'string') return memoryTagsLower.includes(st.toLowerCase().trim());
                            return false;
                        });
                        
                        const isMovieMatch = cat.id === 'movies' && request.data.movieData;
                        return isIdMatch || hasTagIdMatch || isMovieMatch;
                    })
                    .map(cat => ({
                        categoryId: cat.id,
                        label: cat.title || cat.label,
                        emoji: cat.emoji
                    }));
            } else {
                // Fallback to legacy 'board' document if no active found (prevent breakage)
                const legacyRef = boardsColl.doc(SINGLETON_DOCS.BINGO_BOARD);
                const legacyDoc = await legacyRef.get();
                if (legacyDoc.exists) {
                    const categories = legacyDoc.data().categories || [];
                    const memoryTagsLower = (memoryData.tags || []).map(t => t.toLowerCase().trim());
                    bingoSuggestions = categories
                        .filter(cat => {
                            if (cat.completedMemoryId || cat.isEnabled === false) return false;
                            const suggestedTags = cat.suggestedTags || [];
                            if (suggestedTags.length === 0) return false;
                            return suggestedTags.every(st => {
                                const catTag = (typeof st === 'string' ? st : st.value).toLowerCase().trim();
                                return memoryTagsLower.includes(catTag);
                            });
                        })
                        .map(cat => ({
                            categoryId: cat.id,
                            label: cat.title || cat.label,
                            emoji: cat.emoji
                        }));
                }
            }
        } catch (bingoErr) {
            logger.warn('Bingo suggestion check failed:', bingoErr);
        }

        // 7. Log Activity
        await logActivity({
            relationshipId,
            userId: uid,
            action: ACTIVITY_ACTIONS.MEMORY_CREATED,
            targetType: COLLECTIONS.MEMORIES,
            targetId: memoryId,
            displayText: `creó un nuevo recuerdo: ${memoryData.title}`,
            metadata: {
                title: memoryData.title,
                photoCount: photoCount,
                hasPlace: !!memoryData.placeId
            }
        });

        return {
            success: true,
            memoryId: memoryId,
            bingoSuggestions: bingoSuggestions,
            message: 'Recuerdo creado correctamente.'
        };

    } catch (error) {
        logger.error('Error in createMemory:', error);
        throw new HttpsError('internal', 'Falló la creación del recuerdo en la base de datos.');
    }
};

