import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getFunctions } from 'firebase-admin/functions';
import { logger } from 'firebase-functions';
import { sendNotificationToTokens } from '../utils/notifications.js';
import { COLLECTIONS } from '../config/constants.js';

/**
 * createSnapshot — Admin-only API. Admin sends quick snapshots to Partner.
 *
 * Flow:
 * 1. Frontend uploads the file to Storage (path: {relationshipId}/snapshots/{snapshotId}/...)
 * 2. Frontend calls this function with { photoUrl, storagePath, message }
 * 3. Creates relationships/{relId}/snapshots/{id} doc with isSeen=false, expiresAt=+24h
 * 4. Creates a subcollection photo doc so Gallery collectionGroup picks it up
 * 5. Enqueues Cloud Task to archive exactly 24 h from now
 * 6. Sends FCM to the Partner in the same relationship
 */
export const createSnapshot = onCall({ region: 'us-central1', cors: true }, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Unauthorized');
        }

        const db = getFirestore();
        let { relationshipId, role } = request.auth.token || {};

        // Fallback: If custom claims are not yet in the token, fetch from user document
        if (!relationshipId || !role) {
            const userDoc = await db.collection(COLLECTIONS.USERS).doc(request.auth.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                relationshipId = relationshipId || userData.relationshipId;
                role = role || userData.role;
            }
        }

        if (!relationshipId) {
            throw new HttpsError('failed-precondition', 'El usuario no tiene una relación asignada.');
        }

        const { photoUrl, storagePath, message } = request.data;
        if (!photoUrl || !storagePath) {
            throw new HttpsError('invalid-argument', 'photoUrl and storagePath are required.');
        }

        const batch = db.batch();

        // ── 2. Build snapshot document ──
        const snapshotRef = db.collection('relationships')
            .doc(relationshipId)
            .collection(COLLECTIONS.INSTANTANEAS)
            .doc();
        
        const now = Timestamp.now();
        const expiresAt = Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);

        const snapshotData = {
            photoUrl,
            storagePath,
            relationshipId: relationshipId || '', 
            message: message?.substring(0, 80) || '',
            createdAt: now,
            isSeen: false,
            seenAt: null,
            isArchived: false,
            archivedAt: null,
            expiresAt,
            createdBy: request.auth.uid,
            createdByRole: role || 'admin',   
        };
        batch.set(snapshotRef, snapshotData);

        // ── 3. Gallery integration ──
        const photoRef = snapshotRef.collection(COLLECTIONS.PHOTOS).doc(snapshotRef.id);
        batch.set(photoRef, {
            url: photoUrl,
            storagePath,
            relationshipId: relationshipId || '',
            caption: message || 'Instantánea ✨',
            createdAt: now,
            isSnapshot: true,
            createdByRole: role || 'admin',
        });

        await batch.commit();
        logger.info(`[createSnapshot] Created ${snapshotRef.id} in ${relationshipId} by ${role}`);

        // ── 4. Enqueue Archive Task ──
        try {
            const queue = getFunctions().taskQueue('taskArchiveSnapshot');
            await queue.enqueue(
                { relationshipId, snapshotId: snapshotRef.id },
                { scheduleTime: expiresAt.toDate() }
            );
        } catch (taskErr) {
            logger.error('[createSnapshot] Failed to enqueue archive task:', taskErr.message);
        }

        // ── 5. Notify the OTHER person via FCM ──
        try {
            const userRole = role || 'admin';
            const targetRole = userRole === 'admin' ? 'partner' : 'admin';
            const { sendBatchNotifications } = await import('../services/fcmService.js');
            
            const otherUserQuery = await db.collection(COLLECTIONS.USERS)
                .where('relationshipId', '==', relationshipId)
                .where('role', '==', targetRole)
                .limit(1)
                .get();

            if (!otherUserQuery.empty) {
                const tokens = otherUserQuery.docs[0].data().fcmTokens || [];
                if (tokens.length > 0) {
                    await sendBatchNotifications(tokens, {
                        title: '✨ Un pequeño detalle para ti...',
                        body: message || '¡Acabo de enviarte algo especial! 📸',
                        data: { 
                            type: 'snapshot', 
                            snapshotId: snapshotRef.id,
                            relationshipId 
                        },
                    });
                    logger.info(`[createSnapshot] FCM notification sent to ${targetRole} in ${relationshipId}`);
                }
            }
        } catch (err) {
            logger.error('[createSnapshot] FCM failed:', err.message);
        }

        return { success: true, id: snapshotRef.id };
    } catch (err) {
        logger.error('[createSnapshot] Critical error:', err);
        if (err instanceof HttpsError) throw err;
        throw new HttpsError('internal', err.message || 'Error interno al crear la instantánea.');
    }
});
