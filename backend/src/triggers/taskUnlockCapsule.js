import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { COLLECTIONS, PARTNER_SINGLETON_ID } from '../config/constants.js';

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
        const { capsuleId } = request.data;
        if (!capsuleId) {
            console.error('No capsuleId provided to taskUnlockCapsule');
            return;
        }

        const db = getFirestore();
        const capsuleRef = db.collection(COLLECTIONS.CAPSULES).doc(capsuleId);

        try {
            let notifyData = null;

            // Transaction ensures we only unlock once
            await db.runTransaction(async (t) => {
                const docSnap = await t.get(capsuleRef);
                if (!docSnap.exists) {
                    console.log(`Capsule ${capsuleId} not found, may have been deleted.`);
                    return;
                }

                const data = docSnap.data();
                if (data.isUnlocked) {
                    console.log(`Capsule ${capsuleId} already unlocked.`);
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
                const partnerDoc = await db.collection(COLLECTIONS.USERS).doc(PARTNER_SINGLETON_ID).get();
                if (partnerDoc.exists && partnerDoc.data().fcmTokens?.length) {
                    const { fcmTokens } = partnerDoc.data();
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

        } catch (error) {
            console.error(`Error unlocking capsule ${capsuleId}:`, error);
            throw error; // Let Cloud Tasks retry
        }
    }
);
