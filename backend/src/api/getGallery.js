import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * getGallery API
 * Optimized chronological photo feed merging memory photos and snapshots.
 */
export const getGallery = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');

    const { limit = 30, lastId, lastCreatedAt } = request.data || {};
    const db = getFirestore();

    try {
        const relationshipId = request.auth.token.relationshipId;

        // 1. Fetch memories via Collection Group (to show main photo of each cita)
        let memoriesQuery = db.collectionGroup(COLLECTIONS.MEMORIES)
            .where('relationshipId', '==', relationshipId)
            .orderBy('createdAt', 'desc');

        // 2. Fetch snapshots from relationship subcollection
        let snapshotsQuery = db.collection('relationships')
            .doc(relationshipId)
            .collection(COLLECTIONS.INSTANTANEAS)
            .where('isArchived', '==', true)
            .orderBy('createdAt', 'desc');

        // Apply cursor if provided
        if (lastCreatedAt) {
            const cursorDate = new Date(lastCreatedAt);
            memoriesQuery = memoriesQuery.startAfter(cursorDate);
            snapshotsQuery = snapshotsQuery.startAfter(cursorDate);
        }

        const [memoriesSnap, snapshotsSnap] = await Promise.all([
            memoriesQuery.limit(limit).get(),
            snapshotsQuery.limit(limit).get()
        ]);

        const memoryEntries = memoriesSnap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                url: data.mainPhotoUrl, // Use memory's main photo
                _type: 'memory',
                createdAt: data.createdAt?.toDate()?.toISOString() || null
            };
        }).filter(m => !!m.url); // Only show memories with a main photo

        const archivedSnapshots = snapshotsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            url: doc.data().photoUrl,
            _type: 'snapshot',
            isSnapshot: true,
            wasUnseen: !doc.data().isSeen,
            createdAt: doc.data().createdAt?.toDate()?.toISOString() || null
        }));

        // 3. Merge and sort
        const allPhotos = [...memoryEntries, ...archivedSnapshots]
            .sort((a, b) => {
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTime - aTime;
            })
            .slice(0, limit);

        return {
            success: true,
            photos: allPhotos
        };
    } catch (error) {
        logger.error('Error fetching gallery:', error);
        return { success: false, error: error.message };
    }
});
