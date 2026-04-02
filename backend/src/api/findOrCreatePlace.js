import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');

    let { placeRef, name, address, latitude, longitude, lat, lng, category } = request.data || {};
    const { relationshipId } = request.auth.token;

    // Support both naming schemes from frontend
    latitude = latitude || lat;
    longitude = longitude || lng;

    if (!relationshipId) throw new HttpsError('failed-precondition', 'No relationship found.');
    
    // If no placeRef is provided, generate a deterministic one based on coordinates
    if (!placeRef && latitude && longitude) {
        placeRef = `geo_${latitude.toString().replace('.', '_')}_${longitude.toString().replace('.', '_')}`;
    }

    if (!placeRef) throw new HttpsError('invalid-argument', 'Place reference or coordinates are required.');

    const db = getFirestore();
    const placesColl = db.collection(COLLECTIONS.PLACES);

    try {
        const placeDoc = await placesColl.doc(placeRef).get();

        if (placeDoc.exists) {
            return {
                success: true,
                placeId: placeDoc.id,
                ...placeDoc.data()
            };
        }

        // Create new place if not found
        const placeData = {
            id: placeRef,
            name: name || 'Lugar desconocido',
            address: address || '',
            lat: latitude || 0,
            lng: longitude || 0,
            category: category || 'others',
            visitedCount: 0,
            visitedByRelationshipIds: [],
            visitedBy: [],
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        };

        await placesColl.doc(placeRef).set(placeData);

        return {
            success: true,
            placeId: placeRef,
            ...placeData
        };
    } catch (error) {
        logger.error('findOrCreatePlace error:', error);
        throw new HttpsError('internal', error.message);
    }
};
