import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';
import { sendBatchNotifications, getTokensByRelationship } from '../services/fcmService.js';

/**
 * dispatchEventNow — HTTP Function (onRequest).
 *
 * Llamada por Cloud Tasks exactamente en el unlockDateTime del evento.
 * NO es callable — es un endpoint HTTP autenticado mediante OIDC token
 * (solo Cloud Tasks puede llamarla).
 *
 * Body JSON: { relationshipId: string, eventId: string }
 *
 * Flujo:
 *  1. Verifica que el evento sigue activo y no fue ya despachado
 *  2. Obtiene tokens FCM según targetRole
 *  3. Envía las notificaciones push
 *  4. Marca dispatchedAt para idempotencia
 */
export const handler = async (req, res) => {
    // Solo POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { relationshipId, eventId } = req.body || {};

    if (!relationshipId || !eventId) {
        logger.error('[dispatchEventNow] Missing parameters', req.body);
        return res.status(400).json({ error: 'Se requieren relationshipId y eventId.' });
    }

    logger.info(`[dispatchEventNow] Dispatching event ${eventId} for relationship ${relationshipId}`);

    try {
        const db = getFirestore();
        const eventRef = db
            .collection(COLLECTIONS.RELATIONSHIPS)
            .doc(relationshipId)
            .collection(COLLECTIONS.SPECIAL_EVENTS)
            .doc(eventId);

        const snap = await eventRef.get();

        if (!snap.exists) {
            logger.warn(`[dispatchEventNow] Event ${eventId} not found. Task discarded.`);
            return res.status(200).json({ skipped: true, reason: 'not-found' });
        }

        const event = snap.data();

        // Idempotency guard — already dispatched
        if (event.dispatchedAt !== null && event.dispatchedAt !== undefined) {
            logger.info(`[dispatchEventNow] Event ${eventId} already dispatched. Skipping.`);
            return res.status(200).json({ skipped: true, reason: 'already-dispatched' });
        }

        // Event was deactivated after scheduling — skip gracefully
        if (!event.isActive) {
            logger.info(`[dispatchEventNow] Event ${eventId} is inactive. Skipping.`);
            return res.status(200).json({ skipped: true, reason: 'inactive' });
        }

        // ── Fetch tokens ──────────────────────────────────────────────────────
        const targetRole = event.targetRole || 'both';
        let rawTokens = [];

        if (targetRole === 'both') {
            rawTokens = await getTokensByRelationship(relationshipId);
        } else {
            rawTokens = await getTokensByRole(db, relationshipId, targetRole);
        }

        // Deduplicación estricta con Set
        const tokens = [...new Set(rawTokens)].filter(t => !!t);

        if (tokens.length === 0) {
            logger.warn(`[dispatchEventNow] No tokens for event ${eventId}. Marking dispatched anyway.`);
            await eventRef.update({ dispatchedAt: FieldValue.serverTimestamp() });
            return res.status(200).json({ sent: 0, reason: 'no-tokens' });
        }

        // ── Mark dispatched BEFORE sending (Idempotency) ─────────────────────
        // Evitamos que re-intentos de Cloud Tasks disparen un segundo envío
        await eventRef.update({ dispatchedAt: FieldValue.serverTimestamp() });

        // ── Build push payload (DATA ONLY to avoid duplicates) ──────────────
        const nc = event.notificationConfig || {};
        const deepLink = nc.link || `/?action=special_event&eventId=${eventId}`;

        const payload = {
            // NOTA: No incluimos 'title' ni 'body' en el nivel superior 
            // para que fcmService no cree un objeto 'notification' automático.
            data: {
                title:   nc.title || '🎉 ¡Hay una sorpresa para ti!',
                body:    nc.body  || 'Abre la app para descubrirla...',
                link:    deepLink,
                eventId: eventId,
                type:    'special_event',
            },
            webpushLink: deepLink,
        };

        // ── Send FCM ──────────────────────────────────────────────────────────
        try {
            await sendBatchNotifications(tokens, payload);
            logger.info(`[dispatchEventNow] ✅ Event ${eventId} dispatched to ${tokens.length} UNIQUE token(s).`);
            return res.status(200).json({ success: true, sent: tokens.length });
        } catch (fcmErr) {
            // Si falla el envío, reseteamos para que Cloud Tasks re-intente
            logger.error('[dispatchEventNow] FCM Send Error. Rolling back dispatchedAt:', fcmErr);
            await eventRef.update({ dispatchedAt: null });
            throw fcmErr; // Lanza error para que se active el re-intento de la Task
        }

    } catch (err) {
        logger.error('[dispatchEventNow] Error:', err);
        // Return 500 so Cloud Tasks retries (configurable)
        return res.status(500).json({ error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: tokens filtered by role
// ─────────────────────────────────────────────────────────────────────────────
async function getTokensByRole(db, relationshipId, role) {
    try {
        const snap = await db.collection(COLLECTIONS.USERS)
            .where('relationshipId', '==', relationshipId)
            .where('role', '==', role)
            .get();

        const tokens = [];
        snap.docs.forEach(doc => {
            const map = doc.data().fcmTokens || {};
            Object.entries(map).forEach(([token, meta]) => {
                if (meta?.active !== false && !tokens.includes(token)) {
                    tokens.push(token);
                }
            });
        });
        return tokens;
    } catch (err) {
        logger.error('[dispatchEventNow] getTokensByRole error:', err);
        return [];
    }
}
