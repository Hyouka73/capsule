import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants.js';

/**
 * createMemory API - Solo para usuarios autenticados (Admin o Partner)
 * Valida los datos y maneja la escritura en Firestore de forma segura.
 */
export const createMemory = onCall({ region: 'us-central1', cors: true }, async (request) => {
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
        // Usar el ID proporcionado por el cliente si existe (importante para evitar duplicados con el trigger de Storage)
        const memoryRef = id ? db.collection(COLLECTIONS.MEMORIES).doc(id) : db.collection(COLLECTIONS.MEMORIES).doc();
        const memoryId = memoryRef.id;

        const { offlinePhotoUrls = [] } = request.data;
        let photoCount = 0;
        let mainPhotoUrl = null;

        if (offlinePhotoUrls.length > 0) {
            offlinePhotoUrls.forEach((p, index) => {
                const photoId = p.photoId || db.collection('dummy').doc().id;
                if (index === 0) mainPhotoUrl = p.url;
                photoCount++;
            });
        }

        // SEGUNDO: Crear el documento padre (Memory)
        // Esto asegura que cuando los documentos de fotos se creen abajo, 
        // el padre ya existe para los triggers de Storage/Firestore.
        await memoryRef.set({
            ...memoryData,
            photoCount,
            mainPhotoUrl,
        });

        // TERCERO: Crear los documentos de fotos en Batch
        if (offlinePhotoUrls.length > 0) {
            const batch = db.batch();
            offlinePhotoUrls.forEach((p) => {
                const photoId = p.photoId || db.collection('dummy').doc().id;
                const photoRef = memoryRef.collection(COLLECTIONS.PHOTOS).doc(photoId);

                batch.set(photoRef, {
                    url: p.url,
                    storagePath: p.storagePath,
                    uploadStatus: 'completed',
                    isSnapshot: false,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
            });
            await batch.commit();
        }

        // 5. Incrementar visitCount del lugar si existe
        if (memoryData.placeId) {
            try {
                const placeRef = db.collection(COLLECTIONS.PLACES).doc(memoryData.placeId);
                await placeRef.update({
                    visitCount: FieldValue.increment(1),
                    updatedAt: FieldValue.serverTimestamp()
                });
            } catch (placeErr) {
                logger.warn(`Could not update visitCount for place ${memoryData.placeId}:`, placeErr);
            }
        }

        // 6. Bingo Autodetection — Solo sugerencias, 
        //    sin mutar el tablero
        let bingoSuggestions = [];
        try {
            const bingoRef = db.collection(COLLECTIONS.BINGO_BOARD)
                .doc(SINGLETON_DOCS.BINGO_BOARD);
            const bingoDoc = await bingoRef.get();

            if (bingoDoc.exists) {
                const categories = bingoDoc.data().categories || [];
                
                bingoSuggestions = categories
                    .filter(cat => {
                        // Solo categorías sin completar
                        if (cat.completedMemoryId) return false;
                        
                        // Match por tags
                        const hasTagMatch = (cat.suggestedTags || [])
                            .some(t => {
                                const catTag = typeof t === 'string' ? t : t.value;
                                return (memoryData.tags || []).includes(catTag);
                            });
                        
                        // Match especial para películas
                        const isMovieMatch = cat.id === 'movies' 
                            && request.data.movieData;
                        
                        return hasTagMatch || isMovieMatch;
                    })
                    .map(cat => ({
                        categoryId: cat.id,
                        label: cat.label || cat.title,
                        emoji: cat.emoji
                    }));
            }
        } catch (bingoErr) {
            logger.warn('Bingo suggestion check failed:', bingoErr);
            // No falla createMemory si esto falla
        }

        // 7. Retornar solo lo que el Frontend necesita saber
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
});
