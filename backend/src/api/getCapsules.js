import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * getCapsules — Serverless BFF API
 * 
 * Retorna las cápsulas del tiempo. Filtra el contenido secreto (message/files) 
 * si quien solicita es 'partner' y la cápsula aún está bloqueada, brindando seguridad
 * total directamente en el servidor.
 */
export const getCapsules = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    }

    const { role } = request.auth.token;
    const isAdmin = role === 'admin';

    const db = getFirestore();
    try {
        let query = db.collection(COLLECTIONS.CAPSULES).orderBy('createdAt', 'desc');

        // La vista de Partner no debería ni siquiera cargar las cápsulas destruidas permanentemente
        if (!isAdmin) {
            query = query.where('isDestructed', '==', false);
        }

        const snapshot = await query.get();
        const capsules = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Serialización segura para JSON
                createdAt: data.createdAt?.toDate().toISOString() || null,
                unlockDate: data.unlockDate?.toDate().toISOString() || null,
                unlockedAt: data.unlockedAt?.toDate().toISOString() || null,
                viewedAt: data.viewedAt?.toDate().toISOString() || null,
                destructedAt: data.destructedAt?.toDate().toISOString() || null,
            };
        });

        // Mutación de seguridad de datos:
        // Si no es admin y sigue bloqueada, se elimina la carga útil secreta antes de viajar por red
        if (!isAdmin) {
            capsules.forEach(cap => {
                if (!cap.isUnlocked) {
                    delete cap.message;
                    delete cap.files;
                }
            });
        }

        return {
            success: true,
            docs: capsules
        };
    } catch (error) {
        logger.error('Error fetching capsules:', error);
        throw new HttpsError('internal', 'Ocurrió un error al obtener las cápsulas de Firestore.');
    }
});
