// TODO (v1.1): Implement rate limiting
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants.js';

/**
 * claimPartnerAccount — HTTPS Callable (Public — partner calls pre-auth)
 *
 * Called when partner submits their password on the invite claim form.
 */
export const claimPartnerAccount = onCall({ region: 'us-central1', cors: true }, async (request) => {
    try {
        const { token, password } = request.data;

        if (!token || !password) {
            throw new HttpsError('invalid-argument', 'token y password son requeridos');
        }

        if (password.length < 8) {
            throw new HttpsError('invalid-argument', 'La contraseña debe tener al menos 8 caracteres');
        }

        const db = getFirestore();
        const authAdmin = getAuth();

        // 1. Validate token against inviteTokens collection
        const tokenRef = db.collection('inviteTokens').doc(token);
        const tokenSnap = await tokenRef.get();

        if (!tokenSnap.exists) {
            throw new HttpsError('not-found', 'Link de invitación inválido o expirado');
        }

        const tokenData = tokenSnap.data();

        if (tokenData.isClaimed || tokenData.isRevoked) {
            throw new HttpsError('permission-denied', 'Esta invitación ya no es válida');
        }

        if (tokenData.expiresAt && tokenData.expiresAt.toDate() < new Date()) {
            throw new HttpsError('permission-denied', 'La invitación ha expirado');
        }

        const { relationshipId } = tokenData;

        // 2. Create the NEW Partner user in Firebase Auth
        // No email needed for join-by-token flow (or uses a placeholder)
        const userRecord = await authAdmin.createUser({
            password,
            displayName: 'Partner',
        });

        const newPartnerUid = userRecord.uid;

        // 3. Set custom claims for the and-newly-created user
        await authAdmin.setCustomUserClaims(newPartnerUid, {
            role: 'partner',
            relationshipId,
        });

        // 4. Update Relationship Config to point to this new Partner
        const configRef = db.collection('relationships').doc(relationshipId)
            .collection('config').doc('main');
        
        await configRef.update({
            partnerUid: newPartnerUid,
            'inviteConfig.isActive': false // Deactivate invite link after use
        });

        // 5. Create user document in Firestore
        const userRef = db.collection(COLLECTIONS.USERS).doc(newPartnerUid);
        await userRef.set({
            uid: newPartnerUid,
            role: 'partner',
            accountStatus: 'active',
            relationshipId,
            displayName: 'Partner',
            teaserCompleted: false, // Force teaser for new joins
            welcomeSeen: false,
            createdAt: Timestamp.now(),
            lastActiveAt: Timestamp.now(),
            gameCoins: 100,
            coinTransactions: []
        });

        // 6. Mark token as claimed
        await tokenRef.update({
            isClaimed: true,
            claimedBy: newPartnerUid,
            claimedAt: Timestamp.now()
        });

        // 7. Generate custom token for immediate sign-in
        const customToken = await authAdmin.createCustomToken(newPartnerUid, {
            role: 'partner',
            relationshipId,
        });

        logger.info(`Partner account CREATED and CLAIMED: uid=${newPartnerUid} relationship=${relationshipId}`);

        return {
            success: true,
            customToken,
            userId: newPartnerUid,
        };

        logger.info(`Partner account claimed: uid=${partnerUid} relationship=${relationshipId}`);

        return {
            success: true,
            customToken,
            userId: partnerUid,
        };
    } catch (error) {
        logger.error('claimPartnerAccount error:', {
            error: error.message,
            stack: error.stack
        });

        if (error instanceof HttpsError) throw error;

        throw new HttpsError(
            'internal',
            'Error al reclamar la cuenta. Por favor, intenta de nuevo.'
        );
    }
});

