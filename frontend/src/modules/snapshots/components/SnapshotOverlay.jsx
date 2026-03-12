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

    const [currentIndex, setCurrentIndex] = useState(0);
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
    }, [timerSeconds, currentIndex, markAsSeenAndAdvance]);

    if (!currentSnapshot) return null;

    /* ─── build the visible deck ─── */
    const deckSlots = [];
    for (let slot = 0; slot < DECK_VISIBLE; slot++) {
        const snapIdx = currentIndex + slot;
        if (snapIdx < totalCount) {
            deckSlots.push({ slot, snap: snapshots[snapIdx] });
        }
    }
    const deckSlotsReversed = [...deckSlots].reverse();
    const squirclePath = "M0.5,0 C0.42,0 0,0.42 0,0.5 C0,0.58 0.42,1 0.5,1 C0.58,1 1,0.58 1,0.5 C1,0.42 0.58,0 0.5,0 Z";

    return (
        <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {totalCount > 1 && (
                <div className={styles.counter}>
                    {currentIndex + 1} de {totalCount}
                </div>
            )}

            <button className={styles.closeBtn} onClick={handleClose}>✕</button>

            <svg height="0" width="0" style={{ position: 'absolute' }}>
                <defs>
                    <clipPath clipPathUnits="objectBoundingBox" id="pillowClip">
                        <path d={squirclePath} transform="rotate(45 0.5 0.5)" />
                    </clipPath>
                </defs>
            </svg>

            <div className={styles.stage}>
                <AnimatePresence mode="popLayout">
                    {deckSlotsReversed.map(({ slot, snap }) => {
                        const isActive = slot === 0;
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
                                onClick={isActive ? markAsSeenAndAdvance : undefined}
                                initial={{ x: tx, y: ty, scale: sc, opacity: 0 }}
                                animate={{ x: tx, y: ty, scale: sc, opacity }}
                                exit={{ x: tx - 40, y: ty + 40, scale: sc * 0.8, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            >
                                <div className={styles.photoWrapper}>
                                    <img src={snap.photoUrl} alt="" className={styles.photo} />
                                    {isActive && snap.message && (
                                        <div className={styles.messageOverlay}>
                                            <p className={styles.messageText}>{snap.message}</p>
                                        </div>
                                    )}
                                </div>

                                {isActive && (
                                    <svg className={styles.progressRingSvg} viewBox="0 0 1 1">
                                        <path d={squirclePath} className={styles.timerTrack} transform="rotate(45 0.5 0.5)" />
                                        <path d={squirclePath} className={styles.timerFill} transform="rotate(45 0.5 0.5)" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} />
                                    </svg>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
