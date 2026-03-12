import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * exchangeInviteToken — HTTPS Callable
 *
 * Called by the app when a partner opens an invite link (?t=TOKEN).
 *
 * Input:  { token: string, deviceFingerprint: string }
 * Output: { customToken: string, userId: string }
 */
export const exchangeInviteToken = onCall({ region: 'us-central1' }, async (request) => {
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

        if (tokenData.expiresAt && tokenData.expiresAt.toDate() < new Date()) {
            throw new HttpsError('deadline-exceeded', 'Este token ha expirado');
        }

        // 2. Find or create the partner user in Firebase Auth
        // 2. Find or create the partner user in Firebase Auth
        // No fixed UID — let Firebase generate a real one
        let userRecord = await auth.createUser({
            displayName: 'Partner'
        });

        const realPartnerUid = userRecord.uid;

        // 3. Set custom claims: { role, deviceId }
        await auth.setCustomUserClaims(realPartnerUid, {
            role: 'partner',
            deviceId: deviceFingerprint,
        });

        // 4. Update invite token: mark as claimed
        await tokenRef.update({
            isClaimed: true,
            claimedBy: realPartnerUid,
            claimedAt: Timestamp.now(),
            claimedDeviceId: deviceFingerprint,
        });

        // 5. Update/create user doc in Firestore
        const userRef = db.collection(COLLECTIONS.USERS).doc(realPartnerUid);
        await userRef.set({
            uid: realPartnerUid,
            role: 'partner',
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
            preferences: {
                theme: 'dark',
                galleryOrderBy: 'eventDate',
                language: 'es',
                notificationsEnabled: true,
            },
            createdAt: Timestamp.now(),
            lastActiveAt: Timestamp.now(),
        }, { merge: true });

        // 6. Generate and return the custom token
        const customToken = await auth.createCustomToken(realPartnerUid, {
            role: 'partner',
            deviceId: deviceFingerprint,
        });

        logger.info(`Invite token ${token} successfully exchanged. User ${realPartnerUid} authenticated on device ${deviceFingerprint}.`);

        return {
            success: true,
            customToken,
            userId: realPartnerUid
        };
    } catch (error) {
        logger.error('Error in exchangeInviteToken:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', `Ocurrió un error interno: ${error.message} - Stack: ${error.stack}`);
    }
});
