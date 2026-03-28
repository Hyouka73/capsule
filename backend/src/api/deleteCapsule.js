import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * deleteCapsule — HTTPS Callable
 * Deletes capsule content and files permanently.
 * 
 * Called by frontend after auto-destruction timer
 * OR manually by Admin for permanent cleanup.
 */
export const deleteCapsule = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debe estar autenticado.');
    }

    const { capsuleId } = request.data;
    if (!capsuleId) {
        throw new HttpsError('invalid-argument', 'ID de cápsula requerido.');
    }

    const { relationshipId, role } = request.auth.token;
    if (!relationshipId) {
        throw new HttpsError('failed-precondition', 'Usuario sin relación activa.');
    }

    const db = getFirestore();
    const capsuleRef = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.CAPSULES).doc(capsuleId);

    try {
        const snap = await capsuleRef.get();
        if (!snap.exists) {
            throw new HttpsError('not-found', 'Cápsula no encontrada.');
        }

        const capsuleData = snap.data();

        // Security check
        if (capsuleData.relationshipId !== relationshipId) {
            throw new HttpsError('permission-denied', 'No tienes permiso sobre esta cápsula.');
        }

        // Logic: Only Admin can delete non-destructive capsules
        if (!capsuleData.autoDestroy && role !== 'admin') {
            throw new HttpsError('permission-denied', 'Solo el administrador puede eliminar cápsulas permanentes.');
        }

        // 1. Mark as destroyed in DB + clear secret content
        await capsuleRef.update({
            status: 'destroyed',
            destroyedAt: FieldValue.serverTimestamp(),
            message: '[ELIMINADO]',
            files: [],
            hasAttachments: false,
            updatedAt: FieldValue.serverTimestamp()
        });

        // 2. Storage Cleanup
        const bucket = getStorage().bucket();
        const prefix = `${relationshipId}/capsules/${capsuleId}/`;
        const [files] = await bucket.getFiles({ prefix });
        
        logger.info(`[deleteCapsule] Deleting ${files.length} files with prefix ${prefix}`);
        
        for (const file of files) {
            await file.delete().catch(err => {
                logger.error(`[deleteCapsule] Failed to delete file ${file.name}:`, err);
            });
        }

        return { success: true };
    } catch (error) {
        logger.error(`Error in deleteCapsule [${capsuleId}]:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Error al procesar la eliminación de la cápsula.');
    }
});
