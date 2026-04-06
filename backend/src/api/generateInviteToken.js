import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants.js';
import { v4 as uuidv4 } from 'uuid';

export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');

    const { role, relationshipId, uid } = request.auth.token;
    if (role !== 'admin') throw new HttpsError('permission-denied', 'Only admin can generate invite tokens.');

    const db = getFirestore();
    const token = uuidv4().substring(0, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const configColl = db.collection('relationships').doc(relationshipId).collection('config');
    const inviteConfigRef = configColl.doc(SINGLETON_DOCS.INVITE_CONFIG);
    const relationshipRef = configColl.doc(SINGLETON_DOCS.RELATIONSHIP);

    try {

        // 1. ROBUST REVOCATION: Find any user with role 'partner' in this relationship
        const partnersSnap = await db.collection(COLLECTIONS.USERS)
            .where('relationshipId', '==', relationshipId)
            .where('role', '==', 'partner')
            .get();

        if (!partnersSnap.empty) {
            logger.info(`[generateInviteToken] Found ${partnersSnap.size} partner(s) to revoke for relationship ${relationshipId}`);
            
            for (const partnerDoc of partnersSnap.docs) {
                const partnerUid = partnerDoc.id;
                await partnerDoc.ref.update({
                    accountStatus: 'revoked', isRevoked: true,
                    revokedAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp()
                });
                try {
                    await getAuth().revokeRefreshTokens(partnerUid);
                    logger.info(`[generateInviteToken] Revoked refresh tokens for partner: ${partnerUid}`);
                } catch (authError) {
                    logger.warn(`[generateInviteToken] Could not revoke refresh tokens for ${partnerUid}: ${authError.message}`);
                }
            }

            // Keep partnerUid in config/relationship, just deactivate inviteConfig
            await relationshipRef.set({ updatedAt: FieldValue.serverTimestamp() }, { merge: true });
            await inviteConfigRef.set({ isActive: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        }

        // Revoke all previous ACTIVE tokens for this relationship
        const activeTokensSnap = await db.collection(COLLECTIONS.INVITE_TOKENS)
            .where('relationshipId', '==', relationshipId)
            .where('isRevoked', '==', false)
            .get();

        if (!activeTokensSnap.empty) {
            const tokenBatch = db.batch();
            activeTokensSnap.forEach(doc => {
                tokenBatch.update(doc.ref, { 
                    isRevoked: true,
                    revokedAt: FieldValue.serverTimestamp(),
                    revokedBy: uid
                });
            });
            await tokenBatch.commit();
            logger.info(`[generateInviteToken] Revoked ${activeTokensSnap.size} existing tokens for relationship ${relationshipId}`);
        }

        await db.collection(COLLECTIONS.INVITE_TOKENS).doc(token).set({
            token,
            relationshipId,
            createdBy: uid,
            createdAt: FieldValue.serverTimestamp(),
            expiresAt: Timestamp.fromDate(expiresAt),
            isClaimed: false,
            isRevoked: false
        });

        const baseUrl = process.env.APP_URL || (process.env.FUNCTIONS_EMULATOR ? 'http://localhost:5173' : 'https://capsule-sooty.vercel.app');
        const inviteUrl = `${baseUrl}/join?t=${token}`;

        // Update config/inviteConfig doc
        await inviteConfigRef.set({
            token,
            inviteUrl,
            generatedAt: FieldValue.serverTimestamp(),
            expiresAt: Timestamp.fromDate(expiresAt),
            isActive: true,
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        return { 
            success: true, 
            token, 
            inviteUrl,
            expiresAt: expiresAt.toISOString()
        };
    } catch (error) {
        logger.error('generateInviteToken error:', error);
        throw new HttpsError('internal', error.message);
    }
};
