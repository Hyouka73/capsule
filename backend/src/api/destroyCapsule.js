import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * destroyCapsule — HTTPS Callable
 * Irreversibly deletes capsule content and files.
 * Called after auto-destruction timer or manual skip.
 * 
 * Input: { capsuleId: string }
 */
export const destroyCapsule = onCall({ region: 'us-central1', cors: true }, async (request) => {
    // 1. Validate Auth
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debe estar autenticado.');
    }

    const { capsuleId } = request.data;
    if (!capsuleId) {
        throw new HttpsError('invalid-argument', 'ID de cápsula requerido.');
    }

    const relationshipId = request.auth.token.relationshipId;
    const role = request.auth.token.role;

    if (!relationshipId) {
        throw new HttpsError('failed-precondition', 'Usuario sin relación activa.');
    }

    const db = getFirestore();
    const capsuleRef = db.collection(COLLECTIONS.CAPSULES).doc(capsuleId);

    try {
        const snap = await capsuleRef.get();
        if (!snap.exists) {
            throw new HttpsError('not-found', 'Cápsula no encontrada.');
        }

        const capsuleData = snap.data();

        // 2. Validate Ownership (Data Isolation)
        if (capsuleData.relationshipId !== relationshipId) {
            throw new HttpsError('permission-denied', 'No tienes permiso para destruir esta cápsula.');
        }

        // 3. Mark in DB + Clear content
        await capsuleRef.update({
            status: 'destroyed',
            destroyedAt: FieldValue.serverTimestamp(),
            message: '[ELIMINADO POR AUTODESTRUCCIÓN]',
            files: [],
            hasAttachments: false,
            updatedAt: FieldValue.serverTimestamp()
        });

        // 4. Delete files from Storage
        const bucket = getStorage().bucket();
        const [files] = await bucket.getFiles({ prefix: `capsules/${capsuleId}/` });
        
        logger.info(`[destroyCapsule] Deleting ${files.length} files for capsule ${capsuleId}`);
        for (const file of files) {
            await file.delete().catch(err => {
                logger.error(`[destroyCapsule] Failed to delete file ${file.name}:`, err);
            });
        }

        return { success: true };
    } catch (error) {
        logger.error('destroyCapsule error:', { capsuleId, error: error.message });
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Error interno al destruir la cápsula.');
    }
});

