import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { uid } = request.auth;
    let { relationshipId, role } = request.auth.token || {};

    const db = getFirestore();

    // FALLBACK: Si el token es viejo y no tiene relationshipId, lo buscamos en el doc del usuario
    if (!relationshipId) {
        logger.info(`RelationshipId missing in token for user ${uid}. Fetching from user document...`);
        const userSnap = await db.collection('users').doc(uid).get();
        if (userSnap.exists) {
            relationshipId = userSnap.data().relationshipId;
        }
    }

    if (!relationshipId) {
        logger.error(`No relationshipId found for user ${uid} after fallback.`);
        throw new HttpsError('failed-precondition', 'El usuario no tiene una relación asignada.');
    }

    const capsulesColl = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.CAPSULES);

    try {
        // Don't use orderBy('createdAt') — seed docs may lack this field and Firestore 
        // silently excludes them. Fetch all and sort in JS.
        const snapshot = await capsulesColl.get();
        
        logger.info(`Fetching capsules for relationship: ${relationshipId}. Found: ${snapshot.size}`);

        const now = Date.now();
        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const capsules = results.map(c => {
            const unlockDate = c.unlockDate?.toMillis ? c.unlockDate.toMillis() : (c.unlockDate?.seconds ? c.unlockDate.seconds * 1000 : c.unlockDate);
            const createdAt = c.createdAt?.toMillis ? c.createdAt.toMillis() : (c.createdAt?.seconds ? c.createdAt.seconds * 1000 : c.createdAt || 0);
            const updatedAt = c.updatedAt?.toMillis ? c.updatedAt.toMillis() : (c.updatedAt?.seconds ? c.updatedAt.seconds * 1000 : c.updatedAt || 0);
            
            // Lógica de desbloqueo dinámica (Server-side)
            let isUnlocked = Boolean(c.isUnlocked);
            if (!isUnlocked && c.unlockTrigger === 'date' && unlockDate && now >= unlockDate) {
                isUnlocked = true;
            }

            const capsule = {
                ...c,
                unlockDate,
                createdAt,
                updatedAt,
                isUnlocked,
                isViewed: Boolean(c.isViewed || c.viewedAt)
            };

            // 🛡️ SEGURIDAD: Si no está desbloqueada y NO es admin, borrar campos sensibles
            if (!isUnlocked && role !== 'admin') {
                delete capsule.message;
                delete capsule.files;
                delete capsule.links;
                delete capsule.title; // Borramos el título real para el partner y dejamos el teaser
            }

            return capsule;
        });

        // Sort newest first
        capsules.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        return { 
            success: true, 
            capsules
        };
    } catch (error) {
        logger.error('getCapsules error:', { relationshipId, error: error.message });
        throw new HttpsError('internal', 'Error al obtener las cápsulas del tiempo.');
    }
};
