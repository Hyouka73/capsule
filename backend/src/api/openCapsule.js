import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '../config/constants.js';

/**
 * openCapsule — Serverless BFF API (Protocolo Read-Once)
 * 
 * Este endpoint es llamado cuando la novia decide finalmente leer el secreto de una cápsula desbloqueada.
 * Si la cápsula tiene configurada la "autodestrucción", el backend inmediatamente la fulmina de la BBDD, 
 * devolviendo los datos (foto/mensaje) sólo esta única y última vez al cliente para que los autodescargue.
 */
export const openCapsule = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes iniciar sesión para abrir una cápsula.');
    }

    const { capsuleId } = request.data;
    if (!capsuleId) {
        throw new HttpsError('invalid-argument', 'Se requiere el ID de la cápsula.');
    }

    const db = getFirestore();
    const capsuleRef = db.collection(COLLECTIONS.CAPSULES).doc(capsuleId);

    try {
        let capsuleData;

        // Usamos una transacción para asegurar integridad en concurrencia
        await db.runTransaction(async (t) => {
            const snap = await t.get(capsuleRef);
            if (!snap.exists) {
                throw new HttpsError('not-found', 'Cápsula no encontrada o ya se destruyó.');
            }
            capsuleData = snap.data();

            if (!capsuleData.isUnlocked) {
                throw new HttpsError('permission-denied', 'Esta cápsula aún no puede leerse, el tiempo de espera no ha terminado.');
            }

            if (capsuleData.isDestructed) {
                throw new HttpsError('failed-precondition', 'La cápsula ha sido destruida y su mensaje es inaccesible.');
            }

            const updates = {
                isViewed: true,
                viewedAt: Timestamp.now()
            };

            // Protocolo Read-Once: Marcar destruida permanentemente.
            if (capsuleData.autoDestruct) {
                updates.isDestructed = true;
                updates.destructedAt = Timestamp.now();
                // El campo mensaje se censura para el futuro en DB (opcional extra seguridad)
                updates.message = '[DELETED BY AUTODESTRUCT]';
            }

            t.update(capsuleRef, updates);
        });

        // Retorna silenciosamente la carga secreta intacta al Frontend por única vez.
        // El Frontend mostrará la animación y si hay "archivos", usará el link provisto para forzar descarga.
        return {
            success: true,
            capsule: {
                id: capsuleId,
                ...capsuleData,
                isDestructedNow: !!capsuleData.autoDestruct
            }
        };

    } catch (error) {
        console.error(`Error in openCapsule [${capsuleId}]:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Falló la apertura de la cápsula.');
    }
});
