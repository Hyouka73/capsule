import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { v4 as uuidv4 } from 'uuid';

export const generateInviteToken = onCall({ region: 'us-central1' }, async (request) => {
    // Must be authenticated as admin
    if (!request.auth || request.auth.token.role !== 'admin') {
        throw new HttpsError('permission-denied', 'Solo el admin puede generar tokens de invitación');
    }

    const { expiresInDays = null } = request.data ?? {};
    const db = getFirestore();

    const tokenId = uuidv4();

    const expiresAt = expiresInDays
        ? Timestamp.fromDate(new Date(Date.now() + expiresInDays * 86400000))
        : null;

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

    // The app's base URL — update this once deployed to Vercel
    const baseUrl = process.env.APP_URL ?? 'https://capsule.vercel.app';
    const inviteUrl = `${baseUrl}/join?t=${tokenId}`;

    return { tokenId, inviteUrl };
});
