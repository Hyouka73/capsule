import { Suspense, lazy, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpecialEvent } from '../../context/SpecialEventContext';
import styles from './SpecialEventWrapper.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic animation loader
//
// Animations live in: src/assets/animations/{animationSlug}/index.jsx
// Each file must have a default export of a React component.
//
// Example placeholder structure:
//   src/assets/animations/birthday-confetti/index.jsx
//   src/assets/animations/anniversary-stars/index.jsx
//
// Vite will code-split each slug into its own chunk automatically.
// ─────────────────────────────────────────────────────────────────────────────
// Module-level cache: slug → React.lazy component
// This ensures the same lazy() reference is reused across renders,
// preventing Suspense from unmounting and re-mounting the animation.
const animationCache = new Map();

function getAnimation(slug) {
    if (!animationCache.has(slug)) {
        animationCache.set(
            slug,
            lazy(() =>
                import(`../../assets/animations/${slug}/index.jsx`).catch(() => ({
                    default: AnimationPlaceholder,
                }))
            )
        );
    }
    return animationCache.get(slug);
}

/**
 * AnimationPlaceholder — Used while the real animation component is
 * being developed. Shows the event slug so the dev knows what to implement.
 */
function AnimationPlaceholder({ event, onClose }) {
    return (
        <div className={styles.placeholder}>
            <div className={styles.placeholderCard}>
                <span className={styles.placeholderEmoji}>🎉</span>
                <h2 className={styles.placeholderTitle}>Evento Especial</h2>
                <p className={styles.placeholderMeta}>
                    slug: <code>{event.animationSlug}</code>
                </p>
                {!event.isPersistent && (
                    <p className={styles.placeholderHint}>Cerrando automáticamente…</p>
                )}
                {event.isPersistent && (
                    <button className={styles.placeholderClose} onClick={onClose}>
                        ¡Entendido! 🌸
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * SpecialEventWrapper
 *
 * Shell interceptor — wraps the entire app (children = <Routes />).
 * When a pending event is detected:
 *   1) body scroll is locked
 *   2) The full-screen overlay is shown with the animation component
 *   3) If !isPersistent → auto-close after AUTO_CLOSE_MS
 *   4) If isPersistent  → shows a close button; user must close manually
 *
 * When no event is pending:
 *   → children rendered with zero overhead (no extra DOM nodes)
 */
const AUTO_CLOSE_MS = 8000; // Non-persistent events auto-close after 8 s

export default function SpecialEventWrapper({ children }) {
    const { pendingEvent, markAsSeen } = useSpecialEvent();

    const handleClose = useCallback(() => {
        if (pendingEvent) markAsSeen(pendingEvent.eventId);
    }, [pendingEvent, markAsSeen]);

    // Lock scroll when overlay is active
    useEffect(() => {
        if (pendingEvent) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [!!pendingEvent]);

    // Auto-close for non-persistent events
    useEffect(() => {
        if (!pendingEvent || pendingEvent.isPersistent) return;
        const timer = setTimeout(handleClose, AUTO_CLOSE_MS);
        return () => clearTimeout(timer);
    }, [pendingEvent, handleClose]);

    // Look up the cached lazy component for this slug.
    const AnimationComponent = pendingEvent
        ? getAnimation(pendingEvent.animationSlug)
        : null;

    return (
        <>
            {/* Main app — always rendered so Router / Auth state stays mounted */}
            {children}

            {/* Special Event Overlay — portal-like, sits above everything */}
            <AnimatePresence>
                {pendingEvent && AnimationComponent && (
                    <motion.div
                        key={pendingEvent.eventId}
                        className={styles.overlay}
                        id="special-event-container"
                        data-slug={pendingEvent.animationSlug}
                        data-event-id={pendingEvent.eventId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <Suspense fallback={<div className={styles.loadingFallback} />}>
                            <AnimationComponent
                                event={pendingEvent}
                                onClose={handleClose}
                            />
                        </Suspense>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
