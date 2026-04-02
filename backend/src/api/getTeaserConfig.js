import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { SINGLETON_DOCS } from '../config/constants.js';

export const handler = async (request) => {
    const { token } = request.data || {};
    if (!token) throw new HttpsError('invalid-argument', 'Invite token is required to view teaser.');

    const db = getFirestore();

    try {
        const tokenSnap = await db.collection('invite_tokens').doc(token).get();
        if (!tokenSnap.exists) throw new HttpsError('not-found', 'Invitación no encontrada.');

        const { relationshipId } = tokenSnap.data();
        const configSnap = await db.collection('relationships').doc(relationshipId).collection('config').doc(SINGLETON_DOCS.TEASER_CONFIG).get();

        if (!configSnap.exists) {
            return {
                success: true,
                config: {
                    title: 'Nuestra Cápsula'
                }
            };
        }

        return {
            success: true,
            config: configSnap.data()
        };
    } catch (error) {
        logger.error('getTeaserConfig error:', error);
        throw new HttpsError('internal', error.message);
    }
};
