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
    // ── 1. Auth: only Admin can create snapshots ──
    const role = request.auth?.token?.role;
    const relationshipId = request.auth?.token?.relationshipId;

    if (!request.auth || (role !== 'admin')) {
        // Partner NO puede crear snapshots (solo Admin)
        throw new HttpsError('permission-denied', 'Solo el Admin puede crear instantáneas.');
    }

    if (!relationshipId) {
        throw new HttpsError('failed-precondition', 'El usuario no tiene una relación asignada.');
    }

    const { photoUrl, storagePath, message } = request.data;
    if (!photoUrl || !storagePath) {
        throw new HttpsError('invalid-argument', 'photoUrl and storagePath are required.');
    }

    const db = getFirestore();
    const batch = db.batch();

    // ── 2. Build snapshot document in subcollection ──
    const snapshotRef = db.collection('relationships')
        .doc(relationshipId)
        .collection(COLLECTIONS.INSTANTANEAS)
        .doc();
    
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);

    const snapshotData = {
        photoUrl,
        storagePath,
        relationshipId, // Still useful for collectionGroup queries
        message: message?.substring(0, 80) || '',
        createdAt: now,
        isSeen: false,
        seenAt: null,
        isArchived: false,
        archivedAt: null,
        expiresAt,
        createdBy: request.auth.uid,
        createdByRole: role,   // Always 'admin' now
    };
    batch.set(snapshotRef, snapshotData);

    // ── 3. Gallery integration — photos subcollection ──
    const photoRef = snapshotRef.collection(COLLECTIONS.PHOTOS).doc(snapshotRef.id);
    batch.set(photoRef, {
        url: photoUrl,
        storagePath,
        relationshipId,
        caption: message || 'Instantánea ✨',
        createdAt: now,
        isSnapshot: true,
        createdByRole: role,
    });

    await batch.commit();
    logger.info(`[createSnapshot] Created ${snapshotRef.id} in ${relationshipId} by ${role}`);

    // ── 3.5. Activity Log ──
    try {
        const logRef = db
            .collection('relationships')
            .doc(relationshipId)
            .collection(COLLECTIONS.ACTIVITY_LOG)
            .doc();
        await logRef.set({
            userId: request.auth.uid,
            relationshipId,
            action: 'snapshot_created',
            targetType: 'snapshot',
            targetId: snapshotRef.id,
            displayText: 'Envió una instantánea ✨',
            metadata: { message: message || '' },
            isReadByAdmin: false,
            readAt: null,
            createdAt: FieldValue.serverTimestamp(),
        });
    } catch (logErr) {
        logger.warn('[createSnapshot] Failed to log activity:', logErr.message);
    }

    // ── 4. Enqueue Cloud Task to archive at expiresAt ──
    try {
        const queue = getFunctions().taskQueue('taskArchiveSnapshot');
        await queue.enqueue(
            { relationshipId, snapshotId: snapshotRef.id }, // Added relationshipId to payload
            { scheduleTime: expiresAt.toDate() }
        );
        logger.info(`[createSnapshot] Archive task enqueued for ${snapshotRef.id}`);
    } catch (taskErr) {
        logger.error('[createSnapshot] Failed to enqueue archive task:', taskErr.message);
        // Non-fatal — snapshot was created successfully
    }

    // ── 5. Notify the Partner via FCM ──
    try {
        const { sendBatchNotifications, getTokensByRelationship } = await import('../services/fcmService.js');
        const allTokens = await getTokensByRelationship(relationshipId);
        
        // Filter ONLY partner tokens (getTokensByRelationship gets all in relationship)
        // For 1-to-1, we can just filter by role if we have multiple, but here we just need the partner.
        // Efficient way: get the partner user doc
        const partnerQuery = await db.collection(COLLECTIONS.USERS)
            .where('relationshipId', '==', relationshipId)
            .where('role', '==', 'partner')
            .limit(1)
            .get();

        if (!partnerQuery.empty) {
            const tokens = partnerQuery.docs[0].data().fcmTokens || [];
            if (tokens.length > 0) {
                await sendBatchNotifications(tokens, {
                    title: '✨ Tienes una instantánea',
                    body: message || '¡Mira lo que te acabo de enviar!',
                    data: { 
                        type: 'snapshot', 
                        snapshotId: snapshotRef.id,
                        relationshipId 
                    },
                });
                logger.info(`[createSnapshot] FCM notification sent to Partner in ${relationshipId}`);
            }
        }
    } catch (err) {
        logger.error('[createSnapshot] FCM failed (non-fatal):', err.message);
    }

    return { success: true, id: snapshotRef.id };
});
