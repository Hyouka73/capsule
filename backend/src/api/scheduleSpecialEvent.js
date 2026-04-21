import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';
import { scheduleEventDispatch, deleteEventTask } from '../services/cloudTasksService.js';

/**
 * scheduleSpecialEvent — Callable Function (onCall).
 *
 * Llamada por el admin al crear o editar un evento especial.
 * Crea (o re-crea) una Cloud Task one-shot que disparará las notificaciones
 * exactamente en el unlockDateTime configurado.
 *
 * Request body:
 *   { relationshipId: string, eventId: string }
 *
 * El evento ya debe existir en Firestore antes de llamar esta función
 * (el frontend lo escribe primero via SDK, luego llama esto).
 */
export const handler = async (request) => {
    const { auth, data } = request;

    // ── Auth guard ───────────────────────────────────────────────────────────
    if (!auth?.uid) {
        throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    }

    const { relationshipId, eventId } = data || {};

    if (!relationshipId || !eventId) {
        throw new HttpsError('invalid-argument', 'Se requieren relationshipId y eventId.');
    }

    // ── Fetch the event from Firestore ───────────────────────────────────────
    const db = getFirestore();
    const eventRef = db
        .collection(COLLECTIONS.RELATIONSHIPS)
        .doc(relationshipId)
        .collection(COLLECTIONS.SPECIAL_EVENTS)
        .doc(eventId);

    const snap = await eventRef.get();

    if (!snap.exists) {
        throw new HttpsError('not-found', `Evento ${eventId} no encontrado.`);
    }

    const event = snap.data();

    if (!event.isActive) {
        throw new HttpsError('failed-precondition', 'El evento está inactivo. Actívalo primero.');
    }

    const unlockDateTime = new Date(event.unlockDateTime);

    if (isNaN(unlockDateTime.getTime())) {
        throw new HttpsError('invalid-argument', 'unlockDateTime inválido.');
    }

    // testDelaySec: optional override for "test now" — fires N seconds from now
    const { testDelaySec } = data;
    const effectiveTime = (typeof testDelaySec === 'number' && testDelaySec > 0)
        ? new Date(Date.now() + testDelaySec * 1000)
        : unlockDateTime;

    if (effectiveTime.getTime() <= Date.now() && !testDelaySec) {
        throw new HttpsError('failed-precondition', 'La fecha de unlock ya pasó. Para enviar ahora, usa el botón 🔔 de prueba.');
    }

    // ── Cancel previous task for this event (if re-scheduling) ──────────────
    await deleteEventTask(relationshipId, eventId);

    // ── Create new one-shot Cloud Task ───────────────────────────────────────
    const taskName = await scheduleEventDispatch({
        relationshipId,
        eventId,
        scheduledTime: effectiveTime,
    });

    logger.info(`[scheduleSpecialEvent] Task scheduled for event ${eventId} at ${unlockDateTime.toISOString()}`);

    return {
        success: true,
        taskName,
        scheduledFor: unlockDateTime.toISOString(),
    };
};
