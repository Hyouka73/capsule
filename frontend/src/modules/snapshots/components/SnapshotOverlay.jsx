import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { useAppConfig } from '../../../context/AppConfigContext';
import styles from './SnapshotOverlay.module.css';

/**
 * SnapshotOverlay — Shows a queue of unseen snapshots one at a time.
 *
 * Visual deck: max 3 visible at once.
 * - Slot 0 (front/active): centered, full size, timer running.
 * - Slot 1 (behind 1):     slightly smaller, shifted up-right.
 * - Slot 2 (behind 2):     even smaller, shifted further up-right.
 *
 * When the timer fires → active is marked as seen, deck shifts forward.
 *
 * @param {Array}    snapshots - Array of snapshot objects (unseen, ordered oldest→newest)
 * @param {Function} onClose   - Called when all snapshots have been viewed or closed manually
 */

/* How many cards to show in the deck (front + background cards) */
const DECK_VISIBLE = 3;

/* Offset per background slot (px). Each slot shifts further up-right. */
const SLOT_OFFSET_X = 22;   // px right per slot
const SLOT_OFFSET_Y = -18;  // px up per slot
const SLOT_SCALE   = 0.07;  // scale reduction per slot

export default function SnapshotOverlay({ snapshots = [], onClose }) {
    const { snapshotConfig } = useAppConfig();
    const timerSeconds = snapshotConfig?.timerSeconds ?? 9;

    // Index into `snapshots` of the currently-active (front) card
    const [currentIndex, setCurrentIndex] = useState(0);
    // 0 → 1 progress for the circular timer
    const [progress, setProgress] = useState(0);

    const totalCount = snapshots.length;
    const currentSnapshot = snapshots[currentIndex];
    const isLast = currentIndex >= totalCount - 1;

    /* ─── mark-seen + advance ─── */
    const markAsSeenAndAdvance = useCallback(async () => {
        if (!currentSnapshot) return;

        try {
            const snapshotRef = doc(db, 'instantaneas', currentSnapshot.id);
            await updateDoc(snapshotRef, {
                isSeen: true,
                seenAt: serverTimestamp(),
            });
        } catch (err) {
            console.error('Error marking snapshot as seen:', err);
        }

        if (isLast) {
            onClose();
        } else {
            setCurrentIndex(prev => prev + 1);
            setProgress(0);
        }
    }, [currentSnapshot, isLast, onClose]);

    /* ─── close immediately ─── */
    const handleClose = () => {
        if (currentSnapshot) {
            const snapshotRef = doc(db, 'instantaneas', currentSnapshot.id);
            updateDoc(snapshotRef, {
                isSeen: true,
                seenAt: serverTimestamp(),
            }).catch(() => { });
        }
        onClose();
    };

    /* ─── progress animation ─── */
    useEffect(() => {
        let start = null;
        let raf;
        const duration = timerSeconds * 1000;

        const step = (ts) => {
            if (!start) start = ts;
            const elapsed = ts - start;
            const pct = Math.min(elapsed / duration, 1);
            setProgress(pct);
            if (pct < 1) {
                raf = requestAnimationFrame(step);
            }
        };

        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [timerSeconds, currentIndex]);

    /* ─── auto-advance timeout ─── */
    useEffect(() => {
        const timeout = setTimeout(() => {
            markAsSeenAndAdvance();
        }, timerSeconds * 1000);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timerSeconds, currentIndex]);

    if (!currentSnapshot) return null;

    /* ─── build the visible deck (front + up to 2 behind) ─── */
    // remaining = snapshots not yet shown (currentIndex + 1, +2, …)
    const deckSlots = [];
    for (let slot = 0; slot < DECK_VISIBLE; slot++) {
        const snapIdx = currentIndex + slot;
        if (snapIdx < totalCount) {
            deckSlots.push({ slot, snap: snapshots[snapIdx] });
        }
    }
    // Render back-to-front so z-index works (render highest slot first = lowest z)
    const deckSlotsReversed = [...deckSlots].reverse();

    /* ─── conic-gradient ring ─── */
    const angle = progress * 360;
    const ringGradient = `conic-gradient(
        from -90deg,
        rgba(255,255,255,0.90) ${angle}deg,
        rgba(255,255,255,0.15) ${angle}deg
    )`;

    return (
        <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* ── Counter badge (top-right) ── */}
            {totalCount > 1 && (
                <div className={styles.counter}>
                    {currentIndex + 1} de {totalCount}
                </div>
            )}

            {/* ── Close button (top-left) ── */}
            <button className={styles.closeBtn} onClick={handleClose} aria-label="Cerrar">
                ✕
            </button>

            {/* ── Deck stage ── */}
            <div className={styles.stage}>
                {/* Hidden SVG clip path shared by all cards */}
                <svg height="0" width="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
                    <defs>
                        <clipPath clipPathUnits="objectBoundingBox" id="pillowClip">
                            <path
                                d="M0.5,0 C0.42,0 0,0.42 0,0.5 C0,0.58 0.42,1 0.5,1 C0.58,1 1,0.58 1,0.5 C1,0.42 0.58,0 0.5,0 Z"
                                transform="rotate(45 0.5 0.5)"
                            />
                        </clipPath>
                    </defs>
                </svg>

                <AnimatePresence>
                    {deckSlotsReversed.map(({ slot, snap }) => {
                        const isActive = slot === 0;

                        // Position & scale for each slot
                        const tx = slot * SLOT_OFFSET_X;
                        const ty = slot * SLOT_OFFSET_Y;
                        const sc = 1 - slot * SLOT_SCALE;
                        const zIndex = DECK_VISIBLE - slot;
                        const opacity = 1 - slot * 0.12;

                        return (
                            <motion.div
                                key={snap.id}
                                className={styles.cardSlot}
                                style={{ zIndex }}
                                initial={isActive
                                    ? { x: tx, y: ty, scale: sc, opacity: 0 }
                                    : { x: tx, y: ty, scale: sc, opacity }
                                }
                                animate={{ x: tx, y: ty, scale: sc, opacity }}
                                exit={{ x: tx - 30, y: ty + 20, scale: sc * 0.88, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                            >
                                {/* The squircle photo */}
                                <div className={styles.photoWrapper}>
                                    <img
                                        src={snap.photoUrl}
                                        alt="Instantánea"
                                        className={styles.photo}
                                    />

                                    {/* Message only on active card */}
                                    {isActive && snap.message && (
                                        <div className={styles.messageOverlay}>
                                            <p className={styles.messageText}>{snap.message}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Progress ring — only on active card */}
                                {isActive && (
                                    <div
                                        className={styles.progressRingConic}
                                        style={{ background: ringGradient }}
                                    />
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
