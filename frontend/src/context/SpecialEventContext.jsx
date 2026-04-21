import { createContext, useContext, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSpecialEvents } from '../hooks/useSpecialEvents';

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────
const SpecialEventContext = createContext(null);

/**
 * SpecialEventProvider — Resolves the active special event for this session.
 *
 * Must be placed:
 *   - INSIDE  <AuthProvider>        (needs user + role + relationshipId)
 *   - INSIDE  <AppConfigProvider>   (inherits feature flag guards if needed)
 *   - OUTSIDE <BingoProvider>       (no dependency there)
 *
 * Exposes via context:
 *   pendingEvent   {object|null}  — The event to display (null = nothing)
 *   markAsSeen     {function}     — Marks pendingEvent as seen in LocalStorage
 *   isResolved     {boolean}      — True once Firestore has returned a result
 */
export function SpecialEventProvider({ children }) {
    const { relationshipId, role } = useAuth();

    const { pendingEvent, markAsSeen, isResolved } = useSpecialEvents({
        relationshipId,
        role,
    });

    const value = useMemo(() => ({
        pendingEvent,
        markAsSeen,
        isResolved,
    }), [pendingEvent, markAsSeen, isResolved]);

    return (
        <SpecialEventContext.Provider value={value}>
            {children}
        </SpecialEventContext.Provider>
    );
}

/**
 * useSpecialEvent — Consume the SpecialEvent context.
 * Must be used inside <SpecialEventProvider>.
 */
export function useSpecialEvent() {
    const ctx = useContext(SpecialEventContext);
    if (!ctx) throw new Error('useSpecialEvent must be used within <SpecialEventProvider>');
    return ctx;
}

export default SpecialEventContext;
