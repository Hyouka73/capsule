import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * deleteSnapshot — Admin-only API
 * 
 * Elimina una instantánea (documento y archivos en storage).
 */
export const deleteSnapshot = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { role, relationshipId } = request.auth.token;
    if (role !== 'admin') {
        throw new HttpsError('permission-denied', 'Solo el Admin puede eliminar instantáneas.');
    }

    if (!relationshipId) {
        throw new HttpsError('failed-precondition', 'Relationship ID missing in token');
    }

    const { snapshotId } = request.data;
    if (!snapshotId) {
        throw new HttpsError('invalid-argument', 'El snapshotId es obligatorio.');
    }

    const db = getFirestore();
    const storage = getStorage();

    try {
        // Subcollection path: relationships/{id}/snapshots/{snapshotId}
        const snapshotRef = db.collection('relationships')
            .doc(relationshipId)
            .collection(COLLECTIONS.INSTANTANEAS)
            .doc(snapshotId);
        
        const snapshotSnap = await snapshotRef.get();

        if (!snapshotSnap.exists) {
            throw new HttpsError('not-found', 'Instantánea no encontrada en tu relación.');
        }

        const snapshotData = snapshotSnap.data();

        // 1. Eliminar archivos de Storage (si existen)
        if (snapshotData.storagePath) {
            try {
                const bucket = storage.bucket();
                await bucket.file(snapshotData.storagePath).delete();
                // Opcional: eliminar thumbnails si existen en una ruta predecible
                const thumbPath = snapshotData.storagePath.replace('.jpg', '_thumb.jpg');
                await bucket.file(thumbPath).delete().catch(() => {}); 
            } catch (storageErr) {
                logger.warn(`[deleteSnapshot] No se pudo borrar archivo de storage: ${snapshotData.storagePath}`, storageErr.message);
            }
        }

        // 2. Eliminar documento principal
        await snapshotRef.delete();

        // 3. Eliminar subcolección de fotos (Gallery integration)
        const photosSnap = await snapshotRef.collection(COLLECTIONS.PHOTOS).get();
        const batch = db.batch();
        photosSnap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        logger.info(`[deleteSnapshot] Deleted snapshot ${snapshotId} in relationship ${relationshipId}`);

        return {
            success: true,
            message: 'Instantánea eliminada correctamente.'
        };
    } catch (error) {
        logger.error('[deleteSnapshot] Error:', { snapshotId, relationshipId, error: error.message });
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Error al eliminar la instantánea.');
    }
});
