import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * getCapsules — Serverless BFF API
 * 
 * Retorna las cápsulas del tiempo de la relación.
 */
export const getCapsules = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    }

    const { relationshipId, role } = request.auth.token;
    if (!relationshipId) {
        throw new HttpsError('failed-precondition', 'Usuario sin relación activa.');
    }

    const isAdmin = role === 'admin';
    const db = getFirestore();

    try {
        let query = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.CAPSULES)
            .orderBy('createdAt', 'desc');

        // La vista de Partner no debería ver las cápsulas ya destruidas
        if (!isAdmin) {
            query = query.where('status', '!=', 'destroyed');
        }

        const snapshot = await query.get();
        const capsules = snapshot.docs.map(doc => {
            const data = doc.data();
            
            // Helper to safely convert Firestore Timestamp or Number to ISO
            const toISO = (ts) => {
                if (!ts) return null;
                if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
                if (typeof ts === 'number') return new Date(ts).toISOString();
                return null;
            };

            return {
                id: doc.id,
                ...data,
                // Serialización segura para JSON
                createdAt: toISO(data.createdAt),
                unlockDate: toISO(data.unlockDate || data.unlockAt), // Backward compatibility
                unlockedAt: toISO(data.unlockedAt),
                openedAt: toISO(data.openedAt),
                destroyedAt: toISO(data.destroyedAt),
            };
        });

        // Mutación de seguridad de datos:
        // Si no es admin y sigue bloqueada, se elimina la carga útil secreta
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

