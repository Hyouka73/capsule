import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { COLLECTIONS } from '../config/constants';

// ─────────────────────────────────────────────────────────────────────────────
// LocalStorage key — stores an array of eventIds already seen by this device.
// Key format: capsule_seen_events  →  JSON.stringify(string[])
// ─────────────────────────────────────────────────────────────────────────────
const SEEN_EVENTS_KEY = 'capsule_seen_events';

/**
 * Reads the Set of seen event IDs from LocalStorage.
 * @returns {Set<string>}
 */
function getSeenSet() {
    try {
        const raw = localStorage.getItem(SEEN_EVENTS_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
        return new Set();
    }
}

/**
 * Adds an eventId to the seen Set and persists it to LocalStorage.
 * @param {string} eventId
 */
function addToSeenSet(eventId) {
    try {
        const existing = getSeenSet();
        existing.add(eventId);
        localStorage.setItem(SEEN_EVENTS_KEY, JSON.stringify([...existing]));
    } catch {
        // silent — LocalStorage can be full or unavailable in private mode
    }
}

/**
 * Evaluates the full list of Firestore events and returns the first
 * pending event that the current user should see.
 *
 * @param {Array}   events   - Raw documents from Firestore
 * @param {string}  role     - 'admin' | 'partner'
 * @param {Set}     seenSet  - Set of already-seen eventIds
 * @param {string|null} forcedEventId  - eventId from ?action=special_event&eventId=X
 * @returns {object|null}
 */
function resolveActiveEvent(events, role, seenSet, forcedEventId) {
    const now = Date.now();

    // If the URL forced a specific event (notification deep-link), try it first.
    if (forcedEventId) {
        const forced = events.find(e => e.eventId === forcedEventId);
        if (forced && forced.isActive) return forced;
    }

    return events.find(event => {
        if (!event.isActive) return false;

        // Unlock check
        const unlockMs = new Date(event.unlockDateTime).getTime();
        if (isNaN(unlockMs) || now < unlockMs) return false;

        // Already seen on this device
        if (seenSet.has(event.eventId)) return false;

        // Role filter
        const target = event.targetRole || 'both';
        if (target !== 'both' && target !== role) return false;

        return true;
    }) ?? null;
}

/**
 * useSpecialEvents — Core hook for the Special Event Orchestrator.
 *
 * Returns:
 *   pendingEvent   {object|null}  — Active event to show (null = nothing to show)
 *   markAsSeen     {function}     — Call when user dismisses/closes the overlay
 *   isResolved     {boolean}      — True once the Firestore query has returned
 */
export function useSpecialEvents({ relationshipId, role }) {
    const [events, setEvents] = useState([]);
    const [isResolved, setIsResolved] = useState(false);
    const [seenSet, setSeenSet] = useState(() => getSeenSet());

    // Detect ?action=special_event&eventId=... from notification deep-link
    const forcedEventId = useRef(null);
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('action') === 'special_event') {
            forcedEventId.current = params.get('eventId') || null;
        }
    }, []);

    // ── Firestore realtime listener ──────────────────────────────────────────
    useEffect(() => {
        if (!relationshipId) {
            setIsResolved(true);
            return;
        }

        const eventsRef = collection(
            db,
            COLLECTIONS.RELATIONSHIPS,
            relationshipId,
            COLLECTIONS.SPECIAL_EVENTS
        );

        const q = query(eventsRef, where('isActive', '==', true));

        const unsub = onSnapshot(
            q,
            (snap) => {
                const docs = snap.docs.map(d => ({
                    eventId: d.id,
                    ...d.data(),
                }));
                setEvents(docs);
                setIsResolved(true);
            },
            (err) => {
                // Fail gracefully — app still loads normally
                console.warn('[useSpecialEvents] Firestore error:', err.code, err.message);
                setIsResolved(true);
            }
        );

        return () => unsub();
    }, [relationshipId]);

    // ── visibilitychange: re-evaluate on tab focus ───────────────────────────
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                // Force a re-render so we re-check Date.now() vs unlockDateTime.
                // The Firestore onSnapshot listener is always live, so we just
                // need to trigger a re-evaluation of the existing events array.
                setSeenSet(getSeenSet());
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    // ── Derived state ────────────────────────────────────────────────────────
    const pendingEvent = isResolved
        ? resolveActiveEvent(events, role, seenSet, forcedEventId.current)
        : null;

    // ── markAsSeen ───────────────────────────────────────────────────────────
    const markAsSeen = useCallback((eventId) => {
        addToSeenSet(eventId);
        setSeenSet(getSeenSet());

        // Clear the forced deep-link so it doesn't resurface on next check
        if (forcedEventId.current === eventId) {
            forcedEventId.current = null;
        }
    }, []);

    return { pendingEvent, markAsSeen, isResolved };
}
