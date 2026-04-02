import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS, ACTIVITY_ACTIONS } from '../config/constants.js';
import { logActivity } from '../services/activityService.js';

export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');

    const { photoUrl, storagePath, message = '', type = 'daily' } = request.data || {};
    const { relationshipId, uid } = request.auth.token;

    if (!photoUrl) throw new HttpsError('invalid-argument', 'Photo URL (photoUrl) is required.');
    if (!relationshipId) throw new HttpsError('failed-precondition', 'No relationship found.');

    const db = getFirestore();
    const snapshotsColl = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.INSTANTANEAS);

    try {
        const snapshotRef = snapshotsColl.doc();
        const now = FieldValue.serverTimestamp();

        await snapshotRef.set({
            id: snapshotRef.id,
            photoUrl,
            storagePath: storagePath || '',
            message: message || '',
            type,
            isSeen: false,
            isArchived: false,
            createdBy: uid,
            createdAt: now,
            updatedAt: now
        });

        // Activity log
        await logActivity({
            relationshipId,
            userId: uid,
            action: ACTIVITY_ACTIONS.SNAPSHOT_CREATED,
            targetType: COLLECTIONS.INSTANTANEAS,
            targetId: snapshotRef.id,
            displayText: 'ha capturado una nueva instantánea.',
            metadata: { 
                photoUrl,
                message: message || ''
            }
        });

        return { success: true, snapshotId: snapshotRef.id };
    } catch (error) {
        logger.error('createSnapshot error:', error);
        throw new HttpsError('internal', error.message);
    }
};
