import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';
import { sendBatchNotifications, getTokensByRelationship } from '../services/fcmService.js';

/**
 * scheduledEventDispatcher
 *
 * Exported via backend/index.js as an onSchedule Cloud Function.
 * Runs every 60 minutes (configurable in index.js).
 *
 * Algorithm:
 *   1. Scan ALL active relationships
 *   2. For each, query specialEvents WHERE isActive=true AND dispatchedAt=null
 *   3. For each event where unlockDateTime <= now:
 *      a. Fetch FCM tokens for the targetRole
 *      b. Send push notification with deep-link in data.link
 *      c. Write dispatchedAt = serverTimestamp() (idempotency guard)
 *
 * Idempotency: Once dispatchedAt is set, the document is excluded from
 * future queries, so the notification is sent exactly once.
 */
export async function scheduledEventDispatcher(event) {
    const db = getFirestore();
    const now = new Date();

    logger.info('[scheduledEventDispatcher] Run started.', { timestamp: now.toISOString() });

    let dispatchedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    try {
        // ── 1. Get all active relationships ──────────────────────────────────
        const relSnap = await db.collection(COLLECTIONS.RELATIONSHIPS).get();

        if (relSnap.empty) {
            logger.info('[scheduledEventDispatcher] No relationships found. Exiting.');
            return;
        }

        // ── 2. Process each relationship ─────────────────────────────────────
        for (const relDoc of relSnap.docs) {
            const relationshipId = relDoc.id;

            try {
                // Query: active events that haven't been dispatched yet
                const eventsSnap = await db
                    .collection(COLLECTIONS.RELATIONSHIPS)
                    .doc(relationshipId)
                    .collection(COLLECTIONS.SPECIAL_EVENTS)
                    .where('isActive', '==', true)
                    .where('dispatchedAt', '==', null)
                    .get();

                if (eventsSnap.empty) {
                    skippedCount++;
                    continue;
                }

                for (const eventDoc of eventsSnap.docs) {
                    const data = eventDoc.data();
                    const eventId = eventDoc.id;

                    // ── 3. Unlock check ───────────────────────────────────────
                    const unlockMs = new Date(data.unlockDateTime).getTime();
                    if (isNaN(unlockMs) || now.getTime() < unlockMs) {
                        logger.info(`[scheduledEventDispatcher] Event ${eventId} not yet unlocked. Skipping.`);
                        skippedCount++;
                        continue;
                    }

                    // ── 4. Fetch FCM tokens by targetRole ────────────────────
                    const targetRole = data.targetRole || 'both';
                    let tokens = [];

                    if (targetRole === 'both') {
                        // Get all tokens for the relationship
                        tokens = await getTokensByRelationship(relationshipId);
                    } else {
                        // Get tokens only for users matching the target role
                        tokens = await getTokensByRole(db, relationshipId, targetRole);
                    }

                    if (tokens.length === 0) {
                        logger.warn(`[scheduledEventDispatcher] No FCM tokens for event ${eventId} (role: ${targetRole}). Marking as dispatched to avoid retry loops.`);
                        // Still mark dispatched to prevent infinite retries on events with no tokens
                        await eventDoc.ref.update({ dispatchedAt: FieldValue.serverTimestamp() });
                        skippedCount++;
                        continue;
                    }

                    // ── 5. Build notification payload ────────────────────────
                    const notifConfig = data.notificationConfig || {};
                    const deepLink = notifConfig.link
                        || `/?action=special_event&eventId=${eventId}`;

                    const payload = {
                        title: notifConfig.title || '🎉 ¡Hay una sorpresa para ti!',
                        body:  notifConfig.body  || 'Abre la app para descubrirla...',
                        image: notifConfig.image || undefined,
                        // data map — forwarded to notification.data in the SW
                        data: {
                            link:    deepLink,
                            eventId: eventId,
                            type:    'special_event',
                        },
                    };

                    // Override webpush link so the SW notificationclick can read it
                    // from event.notification.data.link (see firebase-messaging-sw.js)
                    payload.webpushLink = deepLink;

                    // ── 6. Send push ─────────────────────────────────────────
                    await sendBatchNotifications(tokens, payload);

                    // ── 7. Mark as dispatched (idempotency) ──────────────────
                    await eventDoc.ref.update({
                        dispatchedAt: FieldValue.serverTimestamp(),
                    });

                    logger.info(`[scheduledEventDispatcher] ✅ Event ${eventId} dispatched to ${tokens.length} token(s).`);
                    dispatchedCount++;
                }
            } catch (relErr) {
                logger.error(`[scheduledEventDispatcher] Error processing relationship ${relationshipId}:`, relErr);
                errorCount++;
            }
        }
    } catch (globalErr) {
        logger.error('[scheduledEventDispatcher] Fatal error:', globalErr);
        throw globalErr;
    }

    logger.info(`[scheduledEventDispatcher] Run complete. Dispatched: ${dispatchedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);
}

/**
 * getTokensByRole — Returns FCM tokens for users in a relationship with a specific role.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} relationshipId
 * @param {'admin'|'partner'} role
 * @returns {Promise<string[]>}
 */
async function getTokensByRole(db, relationshipId, role) {
    try {
        const usersSnap = await db.collection(COLLECTIONS.USERS)
            .where('relationshipId', '==', relationshipId)
            .where('role', '==', role)
            .get();

        const tokens = [];
        usersSnap.docs.forEach(doc => {
            const tokensMap = doc.data().fcmTokens || {};
            Object.entries(tokensMap).forEach(([token, tokenData]) => {
                if (tokenData?.active !== false && !tokens.includes(token)) {
                    tokens.push(token);
                }
            });
        });
        return tokens;
    } catch (err) {
        logger.error(`[scheduledEventDispatcher] getTokensByRole error (role: ${role}):`, err);
        return [];
    }
}
