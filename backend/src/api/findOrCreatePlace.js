import { onCall } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';


function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
}

/**
 * findOrCreatePlace API 
 * Backend Service: Mapea la lógica transaccional de lugares.
 */
export const findOrCreatePlace = onCall({ region: 'us-central1', cors: true }, async (request) => {
    const db = getFirestore();
    const placesRef = db.collection(COLLECTIONS.PLACES);

    if (!request.auth) return { success: false, error: 'Unauthorized' };

    const { lat, lng, name, city, category, tags } = request.data || {};
    const relationshipId = request.auth.token.relationshipId;

    if (!relationshipId) return { success: false, error: 'User missing relationshipId' };
    if (!lat || !lng) return { success: false, error: 'Coordenadas incompletas.' };

    try {
        // PM APPROVED: Solo añadir filtro visitedByRelationshipIds, NO tocar lógica Haversine
        const allPlacesSnapshot = await placesRef.where('visitedByRelationshipIds', 'array-contains', relationshipId).get();
        
        // 1. Refined matching logic: Name + Distance
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        const normalizedName = name ? name.toLowerCase().trim() : null;

        const RADIUS_SAME_SPOT = 20; // 20m: Practically the same physical spot
        const RADIUS_SAME_ESTABLISHMENT = 150; // 150m: For matching by name (covers mall drift/parking)

        let existingPlaceId = null;
        let matchedPlaceData = null;

        allPlacesSnapshot.forEach(doc => {
            const data = doc.data();
            const pLat = data.location?.lat || data.coordinates?.lat;
            const pLng = data.location?.lng || data.coordinates?.lng;
            const pNameNormalized = data.name?.toLowerCase().trim();

            if (pLat && pLng) {
                const dist = haversineDistance(latNum, lngNum, pLat, pLng);
                
                // Priority A: It's the same name and it's reasonably close
                if (normalizedName && normalizedName === pNameNormalized && dist <= RADIUS_SAME_ESTABLISHMENT) {
                    existingPlaceId = doc.id;
                    matchedPlaceData = data;
                } 
                // Priority B: It's VERY close (20m), even if name is generic or differs slightly
                // (but only if we haven't found a better name match yet)
                else if (dist <= RADIUS_SAME_SPOT && !existingPlaceId) {
                    existingPlaceId = doc.id;
                    matchedPlaceData = data;
                }
            }
        });

        const now = new Date();

        if (existingPlaceId) {
            // UPDATING existing place for THIS relationship
            const vBy = matchedPlaceData.visitedBy || [];
            const vIndex = vBy.findIndex(v => v.relationshipId === relationshipId);
            
            let updatedVisitedBy = [...vBy];
            if (vIndex !== -1) {
                // Increment count for current relationship
                updatedVisitedBy[vIndex] = {
                    ...updatedVisitedBy[vIndex],
                    count: (updatedVisitedBy[vIndex].count || 0) + 1,
                    timestamp: now.toISOString()
                };
            } else {
                // This shouldn't happen with the array-contains filter, 
                // but good to have fallback if we ever remove it for broader sharing.
                updatedVisitedBy.push({
                    relationshipId,
                    count: 1,
                    timestamp: now.toISOString()
                });
            }

            const updateData = {
                visitedBy: updatedVisitedBy,
                updatedAt: FieldValue.serverTimestamp()
            };

            // Propagate relationshipIds array for easy querying if needed (redundant here but good practice)
            if (!matchedPlaceData.visitedByRelationshipIds?.includes(relationshipId)) {
                updateData.visitedByRelationshipIds = FieldValue.arrayUnion(relationshipId);
            }

            // Si el nombre viene del front (geocodificado), lo actualizamos 
            // solo si el lugar actual tiene un nombre genérico (coordenadas)
            const isGenericName = matchedPlaceData.name?.includes('(') && matchedPlaceData.name?.includes(')');
            if (name && isGenericName) {
                updateData.name = name;
            }

            await placesRef.doc(existingPlaceId).update(updateData);
            
            return { 
                success: true, 
                placeId: existingPlaceId,
                name: updateData.name || matchedPlaceData.name,
                city: matchedPlaceData.city,
                category: matchedPlaceData.category,
                isNew: false
            };
        }

        // 2. Si no hay cercano y no hay nombre, generamos uno genérico
        const finalName = name || `Lugar en ${city || 'Mapa'} (${latNum.toFixed(4)}, ${lngNum.toFixed(4)})`;

        // 3. Crear nuevo lugar
        // ⚠️ CRÍTICO: NO añadir relationshipId al top-level. Solo visitedBy.
        const newPlaceRef = await placesRef.add({
            name: finalName,
            city: city || '',
            visitedBy: [{
                relationshipId,
                count: 1,
                timestamp: now.toISOString()
            }],
            visitedByRelationshipIds: [relationshipId],
            location: {
                lat: latNum,
                lng: lngNum
            },
            coordinates: { // Keep both formats for compatibility
                lat: latNum,
                lng: lngNum
            },
            category: category || 'otro',
            tags: tags || [],
            photoCount: 0,
            createdBy: request.auth.uid,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        return { 
            success: true, 
            placeId: newPlaceRef.id,
            name: finalName,
            city: city || '',
            category: category || 'otro',
            isNew: true
        };

    } catch (err) {
        logger.error('Error finding/creating place:', err);
        return { success: false, error: err.message };
    }
});
