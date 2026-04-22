import { useState, useEffect, useCallback } from 'react';
import {
    collection, addDoc, updateDoc, deleteDoc,
    onSnapshot, doc, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../../../services/firebase';
import { db } from '../../../services/firebase';
import { COLLECTIONS } from '../../../config/constants';
import { toast } from '../../../components/ui/PastelToast/PastelToast';

// ─────────────────────────────────────────────────────────────────────────────
// Animation slug auto-discovery via Vite's import.meta.glob.
// Scans src/assets/animations/*/index.jsx at build time — zero hardcoding.
// ─────────────────────────────────────────────────────────────────────────────
const animationModules = import.meta.glob(
    '../../../assets/animations/*/index.jsx',
    { eager: false }
);

export const DISCOVERED_SLUGS = Object.keys(animationModules).map((path) => {
    const parts = path.split('/');
    return parts[parts.length - 2]; // folder name = slug
});

// ─────────────────────────────────────────────────────────────────────────────
// Firebase Callable helper
// ─────────────────────────────────────────────────────────────────────────────
function getCallable(name) {
    const functions = getFunctions(app, 'us-central1');
    return httpsCallable(functions, name);
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useSpecialEventManager — CRUD + Cloud Task scheduling.
 *
 * Flow:
 *   createEvent → addDoc to Firestore → call scheduleSpecialEvent (Cloud Task)
 *   updateEvent → updateDoc in Firestore → re-call scheduleSpecialEvent (re-schedules task)
 *   deleteEvent → deleteDoc in Firestore (Cloud Tasks service ignores missing tasks gracefully)
 *   sendTestNotification → reset dispatchedAt → call scheduleSpecialEvent with now+5s
 */
export function useSpecialEventManager(relationshipId) {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // ── Realtime listener ────────────────────────────────────────────────────
    useEffect(() => {
        if (!relationshipId) {
            setIsLoading(false);
            return;
        }

        const ref = collection(
            db,
            COLLECTIONS.RELATIONSHIPS,
            relationshipId,
            COLLECTIONS.SPECIAL_EVENTS
        );
        const q = query(ref, orderBy('unlockDateTime', 'asc'));

        const unsub = onSnapshot(
            q,
            (snap) => {
                setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setIsLoading(false);
            },
            (err) => {
                console.error('[useSpecialEventManager] Snapshot error:', err);
                toast.error('Error', 'No se pudo cargar la lista de eventos.');
                setIsLoading(false);
            }
        );

        return () => unsub();
    }, [relationshipId]);

    // ── createEvent ──────────────────────────────────────────────────────────
    const createEvent = useCallback(async (formData) => {
        if (!relationshipId) return;

        const ref = collection(
            db,
            COLLECTIONS.RELATIONSHIPS,
            relationshipId,
            COLLECTIONS.SPECIAL_EVENTS
        );

        const docRef = await addDoc(ref, {
            ...sanitizePayload(formData),
            dispatchedAt: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        toast.success('¡Evento creado!', 'Programando notificación…');

        // ── Schedule the one-shot Cloud Task ─────────────────────────────────
        if (formData.isActive) {
            await scheduleTask(relationshipId, docRef.id);
        }
    }, [relationshipId]);

    // ── updateEvent ──────────────────────────────────────────────────────────
    const updateEvent = useCallback(async (eventId, formData) => {
        if (!relationshipId) return;

        const ref = doc(
            db,
            COLLECTIONS.RELATIONSHIPS,
            relationshipId,
            COLLECTIONS.SPECIAL_EVENTS,
            eventId
        );

        await updateDoc(ref, {
            ...sanitizePayload(formData),
            // Reset dispatchedAt if the unlock time changed so it can fire again
            dispatchedAt: null,
            updatedAt: serverTimestamp(),
        });

        toast.success('¡Actualizado!', 'Re-programando notificación…');

        // Re-schedule (the service cancels the previous task automatically)
        if (formData.isActive) {
            await scheduleTask(relationshipId, eventId);
        }
    }, [relationshipId]);

    // ── deleteEvent ──────────────────────────────────────────────────────────
    const deleteEvent = useCallback(async (eventId) => {
        if (!relationshipId) return;

        const ref = doc(
            db,
            COLLECTIONS.RELATIONSHIPS,
            relationshipId,
            COLLECTIONS.SPECIAL_EVENTS,
            eventId
        );

        await deleteDoc(ref);
        // The task will fire but dispatchEventNow returns 200 with skipped:not-found
        toast.success('Eliminado', 'El evento fue borrado.');
    }, [relationshipId]);

    // ── sendTestNotification ─────────────────────────────────────────────────
    // Re-schedule the task with a 10-second delay so it fires immediately.
    const sendTestNotification = useCallback(async (event) => {
        if (!relationshipId) return;

        // Reset dispatchedAt so dispatchEventNow doesn't skip it
        const ref = doc(
            db,
            COLLECTIONS.RELATIONSHIPS,
            relationshipId,
            COLLECTIONS.SPECIAL_EVENTS,
            event.id
        );
        await updateDoc(ref, { dispatchedAt: null });

        toast.info('Test', 'Enviando notificación de prueba en ~10 segundos…');

        // Schedule a task 10 seconds from now (overrides any future task)
        await scheduleTask(relationshipId, event.id, /* testDelaySec */ 10);
    }, [relationshipId]);

    return { events, isLoading, createEvent, updateEvent, deleteEvent, sendTestNotification };
}

// ─────────────────────────────────────────────────────────────────────────────
// scheduleTask — Calls scheduleSpecialEvent on the backend.
// The backend reads unlockDateTime from Firestore and schedules the Cloud Task.
// Pass testDelaySec to override the schedule to now + N seconds (for tests).
// ─────────────────────────────────────────────────────────────────────────────
async function scheduleTask(relationshipId, eventId, testDelaySec = null) {
    try {
        const fn = getCallable('scheduleSpecialEvent');
        const payload = { relationshipId, eventId };
        if (testDelaySec !== null) payload.testDelaySec = testDelaySec;
        const result = await fn(payload);
        console.info('[useSpecialEventManager] Task scheduled:', result.data);
    } catch (err) {
        // Don't block the UI — the Firestore write already happened.
        // The admin can retry from the list panel.
        console.warn('[useSpecialEventManager] scheduleTask error:', err.message);
        toast.error(
            'Aviso',
            'El evento se guardó pero no se pudo programar la notificación. Intenta de nuevo con el botón 🔔.'
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function localDatetimeToISO(localDatetimeStr) {
    if (!localDatetimeStr) return null;
    const d = new Date(localDatetimeStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
}

export function isoToLocalDatetime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sanitizePayload(formData) {
    return {
        title:          formData.title?.trim()           || '',
        animationSlug:  formData.animationSlug           || '',
        unlockDateTime: formData.unlockDateTime          || '',
        isPersistent:   Boolean(formData.isPersistent),
        isActive:       Boolean(formData.isActive),
        targetRole:     formData.targetRole              || 'partner',
        notificationConfig: {
            title: formData.notifTitle?.trim() || '🎉 ¡Hay una sorpresa para ti!',
            body:  formData.notifBody?.trim()  || 'Abre la app para descubrirla...',
            link:  formData.notifLink?.trim()  || '',
        },
    };
}
