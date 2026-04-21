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
    const { id, title, description, eventDate, tags, adminNotes, placeName, placeLat, placeLng, claimedBingoCategories } = request.data;

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

        // 6. Bingo Processing - Official Validation & Rewards
        let bingoResults = { claimed: [], rejected: [], coinsEarned: 0 };
        try {
            const boardsColl = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.BINGO_BOARD);
            const activeSnap = await boardsColl.where('status', '==', 'active').limit(1).get();

            if (!activeSnap.empty && claimedBingoCategories?.length > 0) {
                const bingoDoc = activeSnap.docs[0];
                const boardData = bingoDoc.data();
                const categories = boardData.categories || [];
                
                const memoryTagsLower = (tags || []).map(t => {
                    if (typeof t === 'string') return t.toLowerCase().trim();
                    return t?.id?.toLowerCase() || t?.value?.toLowerCase() || '';
                }).filter(Boolean);

                let updated = false;
                let totalCoins = 0;

                // Simple achievement evaluator for rewards calculation
                const evaluateBoard = (cats) => {
                    const ROWS = 4; const COLS = 4;
                    const lines = [];
                    for (let r = 0; r < ROWS; r++) {
                        if ([0, 1, 2, 3].every(c => cats[r * COLS + c]?.completedMemoryId)) lines.push(`row_${r}`);
                    }
                    for (let c = 0; c < COLS; c++) {
                        if ([0, 1, 2, 3].every(r => cats[r * COLS + c]?.completedMemoryId)) lines.push(`col_${c}`);
                    }
                    if ([0, 5, 10, 15].every(i => cats[i]?.completedMemoryId)) lines.push('diag_1');
                    if ([3, 6, 9, 12].every(i => cats[i]?.completedMemoryId)) lines.push('diag_2');
                    return { lines, isFullBoard: cats.every(c => c.completedMemoryId) };
                };

                const oldEvals = evaluateBoard(categories);

                for (const claimId of claimedBingoCategories) {
                    const catIndex = categories.findIndex(c => c.id === claimId);
                    if (catIndex === -1) {
                        bingoResults.rejected.push({ id: claimId, reason: 'not_found' });
                        continue;
                    }

                    const cat = categories[catIndex];
                    if (cat.completedMemoryId) {
                        bingoResults.rejected.push({ id: claimId, reason: 'already_completed' });
                        continue;
                    }

                    // Strict Tag Validation
                    const suggestedTags = cat.suggestedTags || [];
                    const isIdMatch = memoryTagsLower.includes(cat.id.toLowerCase());
                    let hasEverySuggestedMatch = suggestedTags.length > 0 && suggestedTags.every(st => {
                        const stVal = (typeof st === 'string' ? st : (st.id || st.value || '')).toLowerCase().trim();
                        return stVal && memoryTagsLower.includes(stVal);
                    });

                    if (isIdMatch || hasEverySuggestedMatch || (cat.id === 'movies' && request.data.movieData)) {
                        // Mark as completed locally in the loop
                        categories[catIndex] = {
                            ...cat,
                            completedMemoryId: id || memoryId,
                            completedAt: new Date().toISOString()
                        };
                        
                        // Solo las casillas especiales dan monedas (5). Las normales dan 0.
                        let squareReward = cat.isSpecial ? 5 : 0;
                        totalCoins += squareReward;
                        
                        bingoResults.claimed.push({ 
                            id: claimId, 
                            coins: squareReward, 
                            isSpecial: !!cat.isSpecial 
                        });
                        updated = true;
                    } else {
                        bingoResults.rejected.push({ id: claimId, reason: 'invalid_tags' });
                    }
                }

                if (updated) {
                    const newEvals = evaluateBoard(categories);
                    // Add coins for new lines (15 per line)
                    const newLinesCount = newEvals.lines.filter(l => !oldEvals.lines.includes(l)).length;
                    totalCoins += (newLinesCount * 15);
                    
                    if (newEvals.isFullBoard && !oldEvals.isFullBoard) {
                        totalCoins += 50; // Full board bonus
                    }

                    bingoResults.coinsEarned = totalCoins;

                    // Execute updates in Firestore
                    const batch = db.batch();
                    batch.update(bingoDoc.ref, {
                        categories,
                        completedCount: categories.filter(c => c.completedMemoryId).length,
                        updatedAt: FieldValue.serverTimestamp()
                    });

                    if (totalCoins > 0) {
                        const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
                        batch.update(userRef, { gameCoins: FieldValue.increment(totalCoins) });
                    }

                    await batch.commit();

                    // Log Bingo Activity if something was claimed
                    await logActivity({
                        relationshipId,
                        userId: uid,
                        action: 'bingo_completed',
                        targetType: 'bingoBoards',
                        targetId: bingoDoc.id,
                        displayText: `completó ${bingoResults.claimed.length} casilla(s) de Bingo y ganó ${totalCoins} monedas 💰`,
                        metadata: { categories: bingoResults.claimed, coins: totalCoins }
                    });
                }
            }
        } catch (bingoErr) {
            logger.error('Bingo processing failed:', bingoErr);
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
            bingoResults: bingoResults, // Devuelve info de qué se reclamó y si fue aceptado
            message: 'Recuerdo creado correctamente.'
        };

    } catch (error) {
        logger.error('Error in createMemory:', error);
        throw new HttpsError('internal', 'Falló la creación del recuerdo en la base de datos.');
    }
};

