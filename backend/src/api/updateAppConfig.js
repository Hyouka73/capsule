import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { SINGLETON_DOCS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');

    const { relationshipId, role } = request.auth.token;
    if (role !== 'admin') throw new HttpsError('permission-denied', 'Only admin can update config.');

    const { update } = request.data || {};
    if (!update) throw new HttpsError('invalid-argument', 'Update data is required.');

    const db = getFirestore();
    const configColl = db.collection('relationships').doc(relationshipId).collection('config');
    const batch = db.batch();
    const ts = FieldValue.serverTimestamp();

    try {
        // Each key goes to its own independent config document.
        // Format: batch.set(configColl.doc(DOC_NAME), { ...data, updatedAt: ts }, { merge: true })

        if (update.features !== undefined)
            batch.set(configColl.doc(SINGLETON_DOCS.FEATURES), { ...update.features, updatedAt: ts }, { merge: true });

        if (update.visibility !== undefined)
            batch.set(configColl.doc(SINGLETON_DOCS.VISIBILITY), { ...update.visibility, updatedAt: ts }, { merge: true });

        if (update.notifications !== undefined)
            batch.set(configColl.doc(SINGLETON_DOCS.NOTIFICATIONS), { ...update.notifications, updatedAt: ts }, { merge: true });

        // Multimedia: snap and cita config consolidated into one doc
        if (update.multimedia !== undefined || update.snapshotConfig !== undefined || update.citaConfig !== undefined) {
            const multimediaData = {
                ...(update.multimedia || {}),
                ...(update.snapshotConfig ? { snapshotConfig: update.snapshotConfig } : {}),
                ...(update.citaConfig ? { citaConfig: update.citaConfig } : {}),
                updatedAt: ts
            };
            batch.set(configColl.doc(SINGLETON_DOCS.MULTIMEDIA), multimediaData, { merge: true });
        }

        if (update.onboarding !== undefined)
            batch.set(configColl.doc(SINGLETON_DOCS.ONBOARDING), { ...update.onboarding, updatedAt: ts }, { merge: true });

        // memoryTags stored as { tags: [...], updatedAt } — array under a named key
        // so Firestore doesn't treat it as a document with numeric keys
        if (update.memoryTags !== undefined) {
            const tagsArray = Array.isArray(update.memoryTags) ? update.memoryTags : Object.values(update.memoryTags);
            batch.set(configColl.doc(SINGLETON_DOCS.MEMORY_TAGS), { tags: tagsArray, updatedAt: ts });
        }

        // partnerUid goes to the relationship doc
        if (update.partnerUid !== undefined)
            batch.set(configColl.doc(SINGLETON_DOCS.RELATIONSHIP), { partnerUid: update.partnerUid, updatedAt: ts }, { merge: true });

        // inviteConfig → its own doc
        if (update.inviteConfig !== undefined)
            batch.set(configColl.doc(SINGLETON_DOCS.INVITE_CONFIG), { ...update.inviteConfig, updatedAt: ts }, { merge: true });

        // Already-modular docs
        if (update.teaser !== undefined)
            batch.set(configColl.doc(SINGLETON_DOCS.TEASER_CONFIG), { ...update.teaser, updatedAt: ts }, { merge: true });

        if (update.mapConfig !== undefined)
            batch.set(configColl.doc(SINGLETON_DOCS.MAP_CONFIG), { ...update.mapConfig, updatedAt: ts }, { merge: true });

        if (update.modules !== undefined)
            batch.set(configColl.doc(SINGLETON_DOCS.MODULES_CONFIG), { ...update.modules, updatedAt: ts }, { merge: true });

        if (update.partner !== undefined)
            batch.set(configColl.doc(SINGLETON_DOCS.PARTNER_CONFIG), { ...update.partner, updatedAt: ts }, { merge: true });

        if (update.wrapped !== undefined)
            batch.set(configColl.doc(SINGLETON_DOCS.WRAPPED_CONFIG), { ...update.wrapped, updatedAt: ts }, { merge: true });

        await batch.commit();
        return { success: true };
    } catch (error) {
        logger.error('updateAppConfig error:', error);
        throw new HttpsError('internal', error.message);
    }
};
