import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { sendNotificationToTokens } from '../utils/notifications.js';
import { COLLECTIONS, PARTNER_SINGLETON_ID } from '../config/constants.js';

/**
 * createSnapshot — Admin API to share a quick photo
 * 
 * Flow:
 * 1. Frontend uploads to Storage
 * 2. Frontend calls this function with { photoUrl, storagePath, message }
 * 3. We create the doc in /instantaneas
 * 4. We create a subdoc in /instantaneas/{id}/photos/{photoId} so it appears in Gallery
 * 5. We notify the partner via FCM
 */
export const createSnapshot = onCall({ region: 'us-central1' }, async (request) => {
    // 1. Security Check
    if (!request.auth || request.auth.token.role !== 'admin') {
        throw new HttpsError('permission-denied', 'Only admins can create snapshots.');
    }

    const { photoUrl, storagePath, message } = request.data;
    if (!photoUrl || !storagePath) {
        throw new HttpsError('invalid-argument', 'photoUrl and storagePath are required.');
    }

    const db = getFirestore();
    const batch = db.batch();

    // 2. Create the Snapshot document
    const snapshotRef = db.collection(COLLECTIONS.INSTANTANEAS).doc();
    const snapshotData = {
        photoUrl,
        storagePath,
        message: message?.substring(0, 80) || '',
        createdAt: Timestamp.now(),
        isSeen: false,
        seenAt: null,
        createdBy: request.auth.uid
    };
    batch.set(snapshotRef, snapshotData);

    // 3. Create a photo sub-document for Gallery integration
    // This ensures collectionGroup('photos') picks it up
    const photoId = snapshotRef.id; // reuse id or random
    const photoRef = snapshotRef.collection(COLLECTIONS.PHOTOS).doc(photoId);
    batch.set(photoRef, {
        url: photoUrl,
        storagePath,
        caption: message || 'Instantánea ✨',
        createdAt: Timestamp.now(),
        isSnapshot: true
    });

    await batch.commit();

    // 4. Send Notification to Partner
    try {
        const partnerRef = db.collection(COLLECTIONS.USERS).doc(PARTNER_SINGLETON_ID);
        const partnerSnap = await partnerRef.get();

        if (partnerSnap.exists) {
            const tokens = partnerSnap.data().fcmTokens || [];
            if (tokens.length > 0) {
                await sendNotificationToTokens(tokens, {
                    title: '✨ Tienes una instantánea',
                    body: message || '¡Mira lo que te acabo de enviar!',
                    data: {
                        type: 'snapshot',
                        snapshotId: snapshotRef.id
                    }
                });
            }
        }
    } catch (err) {
        console.error('Error sending snapshot notification:', err);
        // We don't fail the whole request if only notification fails
    }

    return { id: snapshotRef.id };
});
