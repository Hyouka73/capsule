import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Filter } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');

    const { limit = 30, lastId, lastCreatedAt } = request.data || {};
    const db = getFirestore();

    try {
        const relationshipId = request.auth.token.relationshipId;

        // 1. Fetch Memories
        let memoriesQuery = db.collectionGroup(COLLECTIONS.MEMORIES)
            .where('relationshipId', '==', relationshipId)
            .orderBy('createdAt', 'desc')
            .limit(limit);

        if (lastCreatedAt) {
            memoriesQuery = memoriesQuery.startAfter(new Date(lastCreatedAt));
        }

        const memoriesSnap = await memoriesQuery.get();

        // 2. Fetch Snapshots (STRICT FILTER)
        // We only want to show snapshots in the main gallery IF:
        // a) They have been seen (isSeen === true)
        // b) They are older than 24h (unlockDateTime is in the past)
        const now = new Date();
        const snapshotsRef = db.collection('relationships')
            .doc(relationshipId)
            .collection(COLLECTIONS.INSTANTANEAS);

        // We fetch a bit more because we'll filter some out locally 
        // to handle the complex OR condition (isSeen OR unlockDateTime < now)
        let snapshotsQuery = snapshotsRef
            .orderBy('createdAt', 'desc')
            .limit(limit * 2); 

        if (lastCreatedAt) {
            snapshotsQuery = snapshotsQuery.startAfter(new Date(lastCreatedAt));
        }

        const snapshotsSnap = await snapshotsQuery.get();
        
        // Manual filter for the "Privacy/Mystery" logic
        const filteredSnapshotDocs = snapshotsSnap.docs.filter(doc => {
            const d = doc.data();
            const isSeen = d.isSeen === true;
            const isExpired = d.unlockDateTime && d.unlockDateTime.toDate() <= now;
            
            return isSeen || isExpired;
        }).slice(0, limit);

        // 3. Map Memories with Fallback for Photos
        const memoryEntries = await Promise.all(memoriesSnap.docs.map(async doc => {
            const data = doc.data();
            let url = data.mainPhotoUrl || data.thumbnailUrl || data.url;

            // FALLBACK: If no mainPhotoUrl, check the photos subcollection
            if (!url) {
                try {
                    const photosSnap = await doc.ref.collection(COLLECTIONS.PHOTOS)
                        .orderBy('createdAt', 'asc')
                        .limit(1)
                        .get();
                    
                    if (!photosSnap.empty) {
                        const photoData = photosSnap.docs[0].data();
                        url = photoData.url || photoData.storagePath;
                        logger.info(`[getGallery] Recovered URL for memory ${doc.id} from subcollection.`);
                    }
                } catch (err) {
                    logger.error(`[getGallery] Error recovering photo for memory ${doc.id}:`, err);
                }
            }

            if (!url) {
                logger.warn(`[getGallery] Memory ${doc.id} filtered out: still no URL after fallback.`);
                return null;
            }

            return {
                id: doc.id,
                ...data,
                url: url,
                _type: 'memory',
                createdAt: data.createdAt?.toDate()?.toISOString() || null
            };
        }));

        // 4. Map Snapshots
        const archivedSnapshots = await Promise.all(filteredSnapshotDocs.map(async doc => {
            const data = doc.data();
            // In snapshots, the field is often photoUrl or url
            let url = data.photoUrl || data.url || data.thumbnailUrl;
            
            if (!url) {
                // BUG FALLBACK: Try to find the "ghost" document in the root collection
                try {
                    const ghostDoc = await db.collection('snapshots').doc(doc.id).get();
                    if (ghostDoc.exists) {
                        const ghostData = ghostDoc.data();
                        url = ghostData.photoUrl || ghostData.url;
                        if (url) {
                            logger.info(`[getGallery] Recovered Snapshot URL for ${doc.id} from root "ghost" collection.`);
                        }
                    }
                } catch (err) {
                    logger.warn(`[getGallery] Ghost recovery failed for snapshot ${doc.id}:`, err);
                }
            }

            if (!url) {
                logger.warn(`[getGallery] Snapshot ${doc.id} filtered out: missing photoUrl.`);
                return null;
            }

            return {
                id: doc.id,
                ...data,
                url: url,
                _type: 'snapshot',
                isSnapshot: true,
                wasUnseen: !data.isSeen,
                createdAt: data.createdAt?.toDate()?.toISOString() || null
            };
        }));

        // Filter out nulls (those without URLs)
        const validMemories = memoryEntries.filter(m => !!m);
        const validSnapshots = archivedSnapshots.filter(s => !!s);

        logger.info(`[getGallery] Relationship: ${relationshipId}. Found: Memories(${validMemories.length}), Snapshots(${validSnapshots.length})`);

        const allPhotos = [...validMemories, ...validSnapshots]
            .sort((a, b) => {
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTime - aTime;
            })
            .slice(0, limit);

        return {
            success: true,
            photos: allPhotos,
            debug: {
                totalMemories: memoriesSnap.size,
                totalSnapshots: snapshotsSnap.size,
                filteredMemories: validMemories.length,
                filteredSnapshots: validSnapshots.length
            }
        };
    } catch (error) {
        logger.error('Error fetching gallery:', error);
        return { success: false, error: error.message };
    }
};
