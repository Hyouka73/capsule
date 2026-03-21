import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * getGallery API
 * Optimized chronological photo feed merging memory photos and snapshots.
 */
export const getGallery = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');

    const { limit = 30, lastId, lastCreatedAt } = request.data || {};
    const db = getFirestore();

    try {
        // 1. Fetch memory photos via Collection Group
        let photosQuery = db.collectionGroup(COLLECTIONS.PHOTOS)
            .where('isSnapshot', '==', false)
            .orderBy('createdAt', 'desc');

        // 2. Fetch snapshots
        let snapshotsQuery = db.collection(COLLECTIONS.INSTANTANEAS)
            .where('isArchived', '==', true)
            .orderBy('createdAt', 'desc');

        // Apply cursor if provided
        if (lastCreatedAt) {
            const cursorDate = new Date(lastCreatedAt);
            // Use the date for both queries
            photosQuery = photosQuery.startAfter(cursorDate);
            snapshotsQuery = snapshotsQuery.startAfter(cursorDate);
        }

        const [photosSnap, snapshotsSnap] = await Promise.all([
            photosQuery.limit(limit).get(),
            snapshotsQuery.limit(limit).get()
        ]);

        const memoryPhotos = photosSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            parentPath: doc.ref.parent.parent?.path,
            _type: 'memory',
            createdAt: doc.data().createdAt?.toDate()?.toISOString() || null
        }));

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
        const allPhotos = [...memoryPhotos, ...archivedSnapshots]
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
