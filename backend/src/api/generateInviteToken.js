const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { HttpsError } = require('firebase-functions/v2/https');

/**
 * generateInviteToken — HTTPS Callable (admin only)
 *
 * Creates a new invite token link in /inviteTokens.
 * Only callable by an authenticated admin.
 *
 * Input:  { expiresInDays?: number } — null = no expiry
 * Output: { tokenId: string, inviteUrl: string }
 */
async function generateInviteToken(request) {
    // Must be authenticated as admin
    if (!request.auth || request.auth.token.role !== 'admin') {
        throw new HttpsError('permission-denied', 'Solo el admin puede generar tokens de invitación');
    }

    const { expiresInDays = null } = request.data ?? {};
    const db = getFirestore();

    // Generate a UUID as the token
    const { v4: uuidv4 } = require('uuid');
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
}

module.exports = { generateInviteToken };
