import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');

    const { uid } = request.auth;
    const { capsuleId } = request.data || {};
    let { relationshipId, role } = request.auth.token || {};

    if (!capsuleId) throw new HttpsError('invalid-argument', 'Capsule ID is required.');

    const db = getFirestore();

    // FALLBACK: Si el token no tiene relationshipId, buscar en el documento del usuario
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

    const capsuleRef = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.CAPSULES).doc(capsuleId);

    try {
        const capsuleSnap = await capsuleRef.get();
        if (!capsuleSnap.exists) throw new HttpsError('not-found', 'Cápsula no encontrada.');

        const data = capsuleSnap.data();
        
        // 1. Permisos: Permitir al destinatario, al Creador O al Admin
        // FLEX: Si no hay recipientUid, el "pareja" (quien no la creó) es el destinatario por defecto
        const isCreator = data.createdBy === uid;
        // RELAXED: En una relación de dos, si no la creaste tú, eres el destinatario.
        // Esto soluciona problemas con cápsulas antiguas o semillas donde recipientUid no estaba definido.
        const isRecipient = data.recipientUid === uid || !isCreator;
        const isAdmin = role === 'admin';

        logger.info(`openCapsule Permission Check: uid=${uid}, recipientUid=${data.recipientUid}, creator=${data.createdBy}, isRecipient=${isRecipient}, isCreator=${isCreator}, role=${role}, isAdmin=${isAdmin}`);

        if (!isRecipient && !isCreator && !isAdmin) {
            throw new HttpsError('permission-denied', 'No tienes permiso para acceder a esta cápsula.');
        }

        // 3. Serializador de seguridad (Fetch on Unlock)
        const serializeCapsule = (raw, unlockedState) => {
            const isActuallyUnlocked = unlockedState ?? (raw.isUnlocked || (raw.unlockTrigger === 'date' && raw.unlockDate && raw.unlockDate.toDate() <= new Date()));
            
            const capsule = {
                ...raw,
                id: capsuleId,
                unlockDate: raw.unlockDate?.toMillis ? raw.unlockDate.toMillis() : (raw.unlockDate?.seconds ? raw.unlockDate.seconds * 1000 : raw.unlockDate),
                createdAt: raw.createdAt?.toMillis ? raw.createdAt.toMillis() : (raw.createdAt?.seconds ? raw.createdAt.seconds * 1000 : raw.createdAt || 0),
                updatedAt: raw.updatedAt?.toMillis ? raw.updatedAt.toMillis() : (raw.updatedAt?.seconds ? raw.updatedAt.seconds * 1000 : raw.updatedAt || 0),
                unlockedAt: raw.unlockedAt?.toMillis ? raw.unlockedAt.toMillis() : (raw.unlockedAt?.seconds ? raw.unlockedAt.seconds * 1000 : raw.unlockedAt || null),
                viewedAt: raw.viewedAt?.toMillis ? raw.viewedAt.toMillis() : (raw.viewedAt?.seconds ? raw.viewedAt.seconds * 1000 : raw.viewedAt || null),
                isUnlocked: isActuallyUnlocked,
                isViewed: Boolean(raw.isViewed || raw.viewedAt),
            };

            // 🛡️ SEGURIDAD ADICIONAL: Si sigue bloqueada y no es admin, limpiar contenido
            if (!isActuallyUnlocked && !isAdmin) {
                delete capsule.message;
                delete capsule.files;
                delete capsule.links;
                delete capsule.title;
            }
            return capsule;
        };

        // 4. Si ya está abierta o destruida, devolver datos serializados
        if (data.status === 'opened' || data.status === 'pending_destruction') {
            return { success: true, capsule: serializeCapsule(data, true) };
        }

        // 5. Validar si puede desbloquearse (si es por fecha y no es Admin forzando)
        const isPastDate = data.unlockTrigger === 'date' && data.unlockDate && data.unlockDate.toDate() <= new Date();
        const canUnlock = isAdmin || data.unlockTrigger === 'manual' || isPastDate;

        if (!canUnlock && !data.isUnlocked) {
            throw new HttpsError('failed-precondition', 'Esta cápsula aún no puede ser abierta. El tiempo no ha llegado.');
        }

        // 6. Actualizar estado en la base de datos
        const updates = {
            isUnlocked: true,
            unlockedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        };

        // Si es el Partner abriéndola por primera vez, marcamos como abierta o destructible
        if (isRecipient) {
            updates.status = data.autoDestroy ? 'pending_destruction' : 'opened';
            updates.viewedAt = FieldValue.serverTimestamp();
            updates.isViewed = true;
            if (!data.recipientUid) updates.recipientUid = uid;
        } else {
            // Si es el Admin desbloqueando manualmente
            updates.status = 'unlocked';
        }

        await capsuleRef.update(updates);

        // 7. Fetch final state to get real timestamps (avoid returning sentinels)
        const finalSnap = await capsuleRef.get();
        return { success: true, capsule: serializeCapsule(finalSnap.data(), true) };
    } catch (error) {
        logger.error('openCapsule error:', {
            message: error.message,
            capsuleId,
            relationshipId
        });
        
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Error al abrir la cápsula');
    }
};
