import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { v4 as uuidv4 } from 'uuid';

export const generateInviteToken = onCall({ region: 'us-central1' }, async (request) => {
    // Must be authenticated as admin
    if (!request.auth || request.auth.token.role !== 'admin') {
        const uid = request.auth?.uid || 'anonymous';
        logger.warn(`Unauthorized attempt to generate invite token by ${uid}`);
        throw new HttpsError('permission-denied', 'Solo el admin puede generar tokens de invitación');
    }

    const { expiresInDays = null } = request.data ?? {};
    const db = getFirestore();
    const baseUrl = process.env.APP_URL ?? 'https://capsule-sooty.vercel.app';

    try {
        // 1. Check if there's an existing valid and unclaimed token
        const tokensRef = db.collection('inviteTokens');
        const snapshot = await tokensRef
            .where('isClaimed', '==', false)
            .where('isRevoked', '==', false)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const existingTokenDoc = snapshot.docs[0];
            const tokenData = existingTokenDoc.data();

            // Re-verify expiration date just in case
            if (!tokenData.expiresAt || tokenData.expiresAt.toDate() > new Date()) {
                logger.info(`Reusing existing valid invite token ${existingTokenDoc.id}`);
                return {
                    success: true,
                    tokenId: existingTokenDoc.id,
                    inviteUrl: `${baseUrl}/join?t=${existingTokenDoc.id}`
                };
            }
        }

        // 2. If no valid token exists, create a new one
        const tokenId = uuidv4();

        const expiresAt = expiresInDays
            ? Timestamp.fromDate(new Date(Date.now() + expiresInDays * 86400000))
            : null;

        // 3. Save the new token in the database
        await db.collection('inviteTokens').doc(tokenId).set({
            token: tokenId,
            createdBy: request.auth.uid,
            createdAt: Timestamp.now(),
            expiresAt,
            isClaimed: false,
            claimedBy: null,
            claimedAt: null,
            claimedDeviceId: null,
            isRevoked: false,
        });

        const inviteUrl = `${baseUrl}/join?t=${tokenId}`;

        logger.info(`Invite token ${tokenId} generated successfully by admin ${request.auth.uid}`);

        return {
            success: true,
            tokenId,
            inviteUrl
        };
    } catch (error) {
        logger.error('Error generating invite token:', error);
        throw new HttpsError('internal', 'Error al generar el token en la base de datos.');
    }
});
