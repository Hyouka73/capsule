import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    increment,
    GeoPoint,
} from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS, PLACE_CATEGORIES } from '../config/constants';

// ─────────────────────────────────────────────────────────────────────────────
// PLACES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Haversine distance between two lat/lng points in kilometers.
 */
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find an existing place within radiusKm of the given coordinates.
 * Returns the first match, or null if none found.
 * @param {number} lat
 * @param {number} lng
 * @param {number} [radiusKm=0.05] - 50m default radius
 * @returns {Promise<object|null>}
 */
export async function findNearbyPlace(lat, lng, radiusKm = 0.05) {
    // Firestore doesn't support geo queries natively — we load all places
    // and filter client-side. With 2 users this will be a small dataset (<1000 places).
    const places = await getPlaces();
    return places.find(p => {
        const dist = haversineKm(lat, lng, p.coordinates.lat, p.coordinates.lng);
        return dist <= radiusKm;
    }) ?? null;
}

/**
 * Get all places (for the map).
 * @returns {Promise<object[]>}
 */
export async function getPlaces() {
    const q = query(
        collection(db, COLLECTIONS.PLACES),
        orderBy('lastVisitDate', 'desc'),
        limit(500)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get a single place by ID.
 * @param {string} placeId
 * @returns {Promise<object|null>}
 */
export async function getPlace(placeId) {
    const docRef = doc(db, COLLECTIONS.PLACES, placeId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() };
}

/**
 * Create a new place.
 * @param {object} data
 * @returns {Promise<string>} New place ID
 */
export async function createPlace(data) {
    const now = serverTimestamp();
    const placeRef = await addDoc(collection(db, COLLECTIONS.PLACES), {
        name: data.name,
        address: data.address ?? null,
        city: data.city ?? '',
        country: data.country ?? 'México',
        coordinates: {
            lat: data.lat,
            lng: data.lng,
        },
        // Stored as GeoPoint for potential future geo queries
        geoPoint: new GeoPoint(data.lat, data.lng),
        category: data.category ?? PLACE_CATEGORIES.OTRO,
        coverPhotoUrl: null,
        coverPhotoStoragePath: null,
        visitCount: 1,
        photoCount: 0,
        firstVisitDate: now,
        lastVisitDate: now,
        tags: data.tags ?? [],
        createdAt: now,
        updatedAt: now,
    });
    return placeRef.id;
}

/**
 * Update a place's denormalized stats atomically.
 * @param {string} placeId
 * @param {object} delta - e.g. { visitCount: 1, photoCount: 3 }
 */
export async function updatePlaceStats(placeId, delta = {}) {
    const docRef = doc(db, COLLECTIONS.PLACES, placeId);
    const updates = { updatedAt: serverTimestamp() };

    if (delta.visitCount) updates.visitCount = increment(delta.visitCount);
    if (delta.photoCount) updates.photoCount = increment(delta.photoCount);
    if (delta.lastVisitDate) updates.lastVisitDate = delta.lastVisitDate;
    if (delta.coverPhotoUrl) updates.coverPhotoUrl = delta.coverPhotoUrl;
    if (delta.tags) updates.tags = delta.tags;

    await updateDoc(docRef, updates);
}

/**
 * Find or create a place for a given location.
 * If a place exists within 50m, returns its ID.
 * Otherwise creates a new place and returns the new ID.
 *
 * @param {{ lat: number, lng: number, name: string, city?: string, category?: string, tags?: string[] }} locationData
 * @returns {Promise<{ placeId: string, isNew: boolean }>}
 */
export async function findOrCreatePlace(locationData) {
    const { lat, lng } = locationData;
    const existing = await findNearbyPlace(lat, lng);

    if (existing) {
        // Update last visit + increment visitCount
        await updatePlaceStats(existing.id, {
            visitCount: 1,
            lastVisitDate: serverTimestamp(),
        });
        return { placeId: existing.id, isNew: false };
    }

    const placeId = await createPlace(locationData);
    return { placeId, isNew: true };
}
