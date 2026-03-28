import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { COLLECTIONS } from '../config/constants.js';

/**
 * unlockScheduledCapsules — Scheduled Trigger (Cron)
 * 
 * Runs every hour to check for capsules that should have been unlocked
 * but weren't (e.g., due to a failed Cloud Task or if Cloud Tasks weren't used).
 */
export const unlockScheduledCapsules = onSchedule('every 24 hours', async (event) => {
    const db = getFirestore();
    const now = Timestamp.now();

    try {
        // 1. Query for locked capsules whose unlock date has passed
        const snapshot = await db.collection(COLLECTIONS.CAPSULES)
            .where('unlockTrigger', '==', 'date')
            .where('isUnlocked', '==', false)
            .where('unlockDate', '<=', now)
            .get();

        if (snapshot.empty) {
            logger.info('No capsules to unlock at this time.');
            return;
        }

        logger.info(`Unlocking ${snapshot.size} capsules...`);

        const messaging = getMessaging();

        // 2. Group capsules by relationshipId for batch notification
        const capsulesByRel = {};
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const relId = data.relationshipId;
            if (!relId) continue;
            
            if (!capsulesByRel[relId]) capsulesByRel[relId] = [];
            capsulesByRel[relId].push({ id: doc.id, data });
            
            // Perform the update immediately
            await doc.ref.update({
                isUnlocked: true,
                unlockedAt: now,
                unlockedByTrigger: 'cron_scheduler',
            });
        }

        // 3. Process each relationship batch for notifications
        for (const [relId, capsuleList] of Object.entries(capsulesByRel)) {
            // Fetch partner(s) for THIS relationship only
            const partnerQuery = await db.collection(COLLECTIONS.USERS)
                .where('role', '==', 'partner')
                .where('relationshipId', '==', relId)
                .limit(1)
                .get();
            
            const fcmTokens = (!partnerQuery.empty) ? (partnerQuery.docs[0].data().fcmTokens || []) : [];
            
            if (fcmTokens.length === 0) continue;

            const capsulesToNotify = capsuleList.filter(c => c.data.notifyOnUnlock);
            
            for (const capsule of capsulesToNotify) {
                const message = {
                    notification: {
                        title: '✨ Tienes una sorpresa',
                        body: capsule.data.teaserMessage ?? '¡Alguien pensó en ti hoy! Abre tu cápsula.',
                    },
                    data: {
                        capsuleId: capsule.id,
                        type: 'capsule_unlocked',
                    },
                    tokens: fcmTokens,
                };
                try {
                    await messaging.sendEachForMulticast(message);
                } catch (err) {
                    console.error(`Failed to send notification for capsule ${capsule.id}:`, err);
                }
            }
        }

    } catch (error) {
        console.error('Error in unlockScheduledCapsules:', error);
    }
});
