import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { v4 as uuidv4 } from 'uuid';

export const generateInviteToken = onCall({ region: 'us-central1', cors: true }, async (request) => {
    // Must be authenticated as admin
    if (!request.auth || request.auth.token.role !== 'admin') {
        const uid = request.auth?.uid || 'anonymous';
        logger.warn(`Unauthorized attempt to generate invite token by ${uid}`);
        throw new HttpsError('permission-denied', 'Solo el admin puede generar tokens de invitación');
    }

    const { expiresAtDays = 7 } = request.data ?? {};
    const { relationshipId } = request.auth.token;
    
    if (!relationshipId) {
        throw new HttpsError('failed-precondition', 'El admin no tiene una relación asignada.');
    }

    const db = getFirestore();
    const baseUrl = process.env.APP_URL || 'https://capsule-sooty.vercel.app';

    try {
        // --- AUTO-REVOKE PREVIOUS PARTNER ---
        const configRef = db.collection('relationships').doc(relationshipId)
            .collection('config').doc('main');
        const configSnap = await configRef.get();

        if (configSnap.exists) {
            const { partnerUid } = configSnap.data();
            if (partnerUid) {
                logger.info(`[generateInviteToken] Revoking existing partner ${partnerUid} before generating new token for relationship ${relationshipId}`);
                
                // 1. Mark partner as revoked in Firestore
                await db.collection('users').doc(partnerUid).update({
                    accountStatus: 'revoked',
                    updatedAt: Timestamp.now()
                });

                // 2. Clear partnerUid from config (it will be refilled when new partner joins)
                await configRef.update({
                    partnerUid: null
                });
                
                // Note: Real-time revocation (auth.revokeRefreshTokens) could be added here
                // but setting status to 'revoked' handles most app logic.
            }
        }
        // 1. Generate new token
        const tokenId = uuidv4();
        const expiresAt = Timestamp.fromDate(new Date(Date.now() + expiresAtDays * 86400000));

        const inviteUrl = `${baseUrl}/join?t=${tokenId}`;

        // 2. Save token globally for lookup during claim
        await db.collection('inviteTokens').doc(tokenId).set({
            token: tokenId,
            relationshipId,
            createdBy: request.auth.uid,
            createdAt: Timestamp.now(),
            expiresAt,
            isClaimed: false,
            isRevoked: false,
        });

        // 3. Update Relationship Config with the new link
        // configRef is already defined above during auto-revoke check
        await configRef.set({
            inviteConfig: {
                inviteLink: inviteUrl,
                generatedAt: Timestamp.now().toDate().toISOString(),
                expiresAt: expiresAt.toDate().toISOString(),
                isActive: true
            }
        }, { merge: true });

        logger.info(`Invite token ${tokenId} generated for relationship ${relationshipId}`);

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
