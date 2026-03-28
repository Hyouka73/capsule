import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * taskUnlockCapsule — Cloud Task Handler
 *
 * This function handles messages enqueued by Firebase Cloud Tasks.
 * It strictly runs at a specific timestamp requested when the capsule was created.
 */
export const taskUnlockCapsule = onTaskDispatched(
    {
        retryConfig: {
            maxAttempts: 3,
            minBackoffSeconds: 60,
        },
        rateLimits: {
            maxConcurrentDispatches: 6,
        },
    },
    async (request) => {
        const { capsuleId, relationshipId } = request.data;
        if (!capsuleId || !relationshipId) {
            logger.error('Missing capsuleId or relationshipId in taskUnlockCapsule payload');
            return;
        }

        const db = getFirestore();
        const capsuleRef = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.CAPSULES).doc(capsuleId);

        try {
            let notifyData = null;

            // Transaction ensures we only unlock once
            await db.runTransaction(async (t) => {
                const docSnap = await t.get(capsuleRef);
                if (!docSnap.exists) {
                    logger.info(`Capsule ${capsuleId} not found, may have been deleted.`);
                    return;
                }

                const data = docSnap.data();
                if (data.isUnlocked) {
                    logger.info(`Capsule ${capsuleId} already unlocked.`);
                    return;
                }

                t.update(capsuleRef, {
                    isUnlocked: true,
                    unlockedAt: Timestamp.now(),
                    unlockedByTrigger: 'scheduled_task',
                });

                if (data.notifyOnUnlock) {
                    notifyData = data;
                }
            });

            // Fallback outside transaction to avoid messaging limits
            if (notifyData) {
                const partnerQuery = await db.collection(COLLECTIONS.USERS)
                    .where('role', '==', 'partner')
                    .where('relationshipId', '==', notifyData.relationshipId) 
                    .limit(1)
                    .get();

                if (!partnerQuery.empty) {
                    const partnerData = partnerQuery.docs[0].data();
                    const fcmTokens = partnerData.fcmTokens || [];
                    
                    if (fcmTokens.length > 0) {
                        const messaging = getMessaging();
                        const message = {
                            notification: {
                                title: '✨ Tienes una sorpresa',
                                body: notifyData.teaserMessage ?? '¡Alguien pensó en ti hoy! Abre tu cápsula.',
                            },
                            data: {
                                capsuleId: capsuleId,
                                type: 'capsule_unlocked',
                            },
                            tokens: fcmTokens,
                        };
                        await messaging.sendEachForMulticast(message);
                    }
                }
            }

        } catch (error) {
            logger.error(`Error unlocking capsule ${capsuleId}:`, error);
            throw error; // Let Cloud Tasks retry
        }
    }
);
