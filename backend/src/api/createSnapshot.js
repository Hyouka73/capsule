import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getFunctions } from 'firebase-admin/functions';
import { logger } from 'firebase-functions';
import { sendNotificationToTokens } from '../utils/notifications.js';
import { COLLECTIONS } from '../config/constants.js';

/**
 * createSnapshot — Shared API: both admin AND partner can send quick snapshots.
 *
 * Flow:
 * 1. Frontend uploads the file to Storage (path: snapshots/{uuid}/originals/photo.jpg)
 * 2. Frontend calls this function with { photoUrl, storagePath, message }
 * 3. Creates /instantaneas/{id} doc with isSeen=false, expiresAt=+24h
 * 4. Creates a subcollection photo doc so Gallery collectionGroup picks it up
 * 5. Enqueues Cloud Task to archive exactly 24 h from now
 * 6. Sends FCM to the OTHER party (admin → partner, partner → admin)
 */
export const createSnapshot = onCall({ region: 'us-central1', cors: true }, async (request) => {
    // ── 1. Auth: both roles can create snapshots ──
    const role = request.auth?.token?.role;
    if (!request.auth || (role !== 'admin' && role !== 'partner')) {
        throw new HttpsError('permission-denied', 'Must be authenticated to create snapshots.');
    }

    const { photoUrl, storagePath, message } = request.data;
    if (!photoUrl || !storagePath) {
        throw new HttpsError('invalid-argument', 'photoUrl and storagePath are required.');
    }

    const db = getFirestore();
    const batch = db.batch();

    // ── 2. Build snapshot document ──
    const snapshotRef = db.collection(COLLECTIONS.INSTANTANEAS).doc();
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);

    const snapshotData = {
        photoUrl,
        storagePath,
        message: message?.substring(0, 80) || '',
        createdAt: now,
        isSeen: false,
        seenAt: null,
        isArchived: false,
        archivedAt: null,
        expiresAt,
        createdBy: request.auth.uid,
        createdByRole: role,   // 'admin' | 'partner'
    };
    batch.set(snapshotRef, snapshotData);

    // ── 3. Gallery integration — photos subcollection ──
    const photoRef = snapshotRef.collection(COLLECTIONS.PHOTOS).doc(snapshotRef.id);
    batch.set(photoRef, {
        url: photoUrl,
        storagePath,
        caption: message || 'Instantánea ✨',
        createdAt: now,
        isSnapshot: true,
        createdByRole: role,
    });

    await batch.commit();
    logger.info(`[createSnapshot] Created ${snapshotRef.id} by ${role}`);

    // ── 4. Enqueue Cloud Task to archive at expiresAt ──
    try {
        const queue = getFunctions().taskQueue('taskArchiveSnapshot');
        await queue.enqueue(
            { snapshotId: snapshotRef.id },
            { scheduleTime: expiresAt.toDate() }
        );
        logger.info(`[createSnapshot] Archive task enqueued for ${snapshotRef.id}`);
    } catch (taskErr) {
        logger.error('[createSnapshot] Failed to enqueue archive task:', taskErr.message);
        // Non-fatal — snapshot was created successfully
    }

    // ── 5. Notify the OTHER party via FCM ──
    try {
        // Admin sends → notify partner. Partner sends → notify admin.
        let tokens = [];

        if (role === 'admin') {
            // Admin sent → notify partner(s)
            // Since there's only one couple, we look for any user with role 'partner'
            const partnerQuery = await db.collection(COLLECTIONS.USERS)
                .where('role', '==', 'partner')
                .limit(1)
                .get();
            
            if (!partnerQuery.empty) {
                tokens = partnerQuery.docs[0].data().fcmTokens || [];
            }
        } else {
            // Partner sent → notify all admins
            const adminQuery = await db.collection(COLLECTIONS.USERS)
                .where('role', '==', 'admin')
                .limit(5)
                .get();
            adminQuery.forEach(doc => {
                tokens.push(...(doc.data().fcmTokens || []));
            });
        }

        if (tokens.length > 0) {
            await sendNotificationToTokens(tokens, {
                title: '✨ Tienes una instantánea',
                body: message || '¡Mira lo que te acabo de enviar!',
                data: { type: 'snapshot', snapshotId: snapshotRef.id },
            });
        }
    } catch (err) {
        logger.error('[createSnapshot] FCM failed (non-fatal):', err.message);
    }

    return { success: true, id: snapshotRef.id };
});
