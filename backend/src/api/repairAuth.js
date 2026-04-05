import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * repairAuth — Self-healing API
 * 
 * Synchronizes Firestore user data (role, relationshipId) 
 * into Firebase Auth Custom Claims.
 */
export const handler = async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado para reparar tu cuenta.');
    }

    const { uid } = request.auth;
    const db = getFirestore();
    const auth = getAuth();

    try {
        logger.info(`[repairAuth] Starting repair for UID: ${uid}`);

        // 1. Fetch user doc from Firestore
        const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
        
        if (!userDoc.exists) {
            logger.error(`[repairAuth] User document not found for UID: ${uid}`);
            throw new HttpsError('not-found', 'Tu perfil de usuario no fue encontrado en la base de datos.');
        }

        const { role, relationshipId } = userDoc.data();

        if (!role || !relationshipId) {
            logger.error(`[repairAuth] User document missing role or relationshipId for UID: ${uid}`);
            throw new HttpsError('failed-precondition', 'Tu perfil de usuario está incompleto. Contacta a soporte.');
        }

        // 2. Update Custom Claims
        await auth.setCustomUserClaims(uid, { role, relationshipId });
        
        logger.info(`[repairAuth] Successfully updated claims for ${uid}: { role: ${role}, relationshipId: ${relationshipId} }`);

        return { 
            success: true, 
            message: 'Permisos sincronizados correctamente. Reiniciando sesión...',
            role,
            relationshipId
        };
    } catch (error) {
        logger.error('[repairAuth] Error during repair:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Error al sincronizar tus permisos.');
    }
};
