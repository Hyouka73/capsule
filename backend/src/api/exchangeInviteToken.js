import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants.js';

/**
 * exchangeInviteToken — HTTPS Callable
 *
 * Called by the app when a partner opens an invite link (?t=TOKEN).
 */
export const exchangeInviteToken = onCall({ region: 'us-central1', cors: true }, async (request) => {
    try {
        const { token, deviceFingerprint } = request.data;

        if (!token || !deviceFingerprint) {
            throw new HttpsError('invalid-argument', 'token y deviceFingerprint son requeridos');
        }

        const db = getFirestore();
        const auth = getAuth();

        // 1. Validate the invite token
        const tokenRef = db.collection(COLLECTIONS.INVITE_TOKENS).doc(token);
        const tokenSnap = await tokenRef.get();

        if (!tokenSnap.exists) {
            throw new HttpsError('not-found', 'Token de invitación no encontrado');
        }

        const tokenData = tokenSnap.data();

        if (tokenData.isRevoked) {
            throw new HttpsError('permission-denied', 'Este token ha sido revocado');
        }

        if (tokenData.isClaimed && tokenData.claimedDeviceId !== deviceFingerprint) {
            throw new HttpsError('permission-denied', 'Este token ya fue usado en otro dispositivo');
        }

        const { relationshipId, expiresAt } = tokenData;
        if (expiresAt) {
            const expiryDate = (typeof expiresAt.toDate === 'function') 
                ? expiresAt.toDate() 
                : new Date(expiresAt);
            
            if (expiryDate < new Date()) {
                throw new HttpsError('deadline-exceeded', 'Este token ha expirado');
            }
        }

        // 2. Find or create the partner user in Firebase Auth
        let userRecord = await auth.createUser({
            displayName: 'Partner'
        });

        const realPartnerUid = userRecord.uid;

        // 3. Set custom claims: { role, deviceId, relationshipId }
        await auth.setCustomUserClaims(realPartnerUid, {
            role: 'partner',
            deviceId: deviceFingerprint,
            ...(relationshipId && { relationshipId }),
        });

        // 3. Mark invite token as claimed
        await tokenRef.update({
            isClaimed: true,
            claimedBy: realPartnerUid,
            claimedAt: Timestamp.now(),
            claimedDeviceId: deviceFingerprint,
        });

        // 4. Update Relationship Config to link this new Partner
        const configRef = db.collection('relationships').doc(relationshipId)
            .collection('config').doc('main');
        
        await configRef.set({
            partnerUid: realPartnerUid,
            updatedAt: Timestamp.now(),
            inviteConfig: {
                isActive: false // Deactivate link after successful claim
            }
        }, { merge: true });

        // 5. Update/create user doc in Firestore
        const userRef = db.collection(COLLECTIONS.USERS).doc(realPartnerUid);
        
        await userRef.set({
            uid: realPartnerUid,
            role: 'partner',
            accountStatus: 'active',
            relationshipId: relationshipId || null,
            displayName: 'Partner',
            deviceId: deviceFingerprint,
            deviceInfo: {
                registeredAt: Timestamp.now(),
                lastSeenAt: Timestamp.now(),
                platform: 'web',
                userAgent: request.rawRequest?.headers?.['user-agent'] ?? '',
            },
            isRevoked: false,
            fcmTokens: [],
            welcomeSeen: false,
            teaserCompleted: false, // Force them to see the intro
            createdAt: Timestamp.now(),
            lastActiveAt: Timestamp.now(),
            gameCoins: 100,
            coinTransactions: []
        }, { merge: true });

        // 6. Generate and return the custom token
        const customToken = await auth.createCustomToken(realPartnerUid, {
            role: 'partner',
            deviceId: deviceFingerprint,
            ...(relationshipId && { relationshipId }),
        });

        logger.info(`Invite token ${token} successfully exchanged. User ${realPartnerUid} authenticated on device ${deviceFingerprint}.`);

        return {
            success: true,
            customToken,
            userId: realPartnerUid
        };
    } catch (error) {
        logger.error('exchangeInviteToken error:', {
            uid: request.auth?.uid || 'anonymous',
            error: error.message,
            stack: error.stack
        });

        if (error instanceof HttpsError) {
            throw error;
        }

        throw new HttpsError(
            'internal',
            'Failed to exchange invite token. Please try again.'
        );
    }
});
