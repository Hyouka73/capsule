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
            console.log('No capsules to unlock at this time.');
            return;
        }

        console.log(`Unlocking ${snapshot.size} capsules...`);

        const messaging = getMessaging();

        // 2. Fetch partner once to reuse tokens in the loop
        const partnerQuery = await db.collection(COLLECTIONS.USERS)
            .where('role', '==', 'partner')
            .limit(1)
            .get();
        
        const fcmTokens = (!partnerQuery.empty) ? (partnerQuery.docs[0].data().fcmTokens || []) : [];

        // 3. Process each capsule
        for (const doc of snapshot.docs) {
            const capsuleId = doc.id;
            const data = doc.data();

            await doc.ref.update({
                isUnlocked: true,
                unlockedAt: now,
                unlockedByTrigger: 'cron_scheduler',
            });

            // 4. Notify partner if needed
            if (data.notifyOnUnlock && fcmTokens.length > 0) {
                const message = {
                    notification: {
                        title: '✨ Tienes una sorpresa',
                        body: data.teaserMessage ?? '¡Alguien pensó en ti hoy! Abre tu cápsula.',
                    },
                    data: {
                        capsuleId: capsuleId,
                        type: 'capsule_unlocked',
                    },
                    tokens: fcmTokens,
                };
                try {
                    await messaging.sendEachForMulticast(message);
                } catch (err) {
                    console.error(`Failed to send notification for capsule ${capsuleId}:`, err);
                }
            }
        }

    } catch (error) {
        console.error('Error in unlockScheduledCapsules:', error);
    }
});
