import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { useAppConfig } from '../../../context/AppConfigContext';
import styles from './SnapshotOverlay.module.css';

/**
 * SnapshotOverlay — Shows a queue of unseen snapshots one at a time.
 * Displays counter "1 de 3", auto-advances after timer, marks each as seen.
 *
 * @param {Array} snapshots - Array of snapshot objects from SnapshotButton
 * @param {Function} onClose - Called when all snapshots have been viewed or manually closed
 */
export default function SnapshotOverlay({ snapshots = [], onClose }) {
    const { snapshotConfig } = useAppConfig();
    const timerSeconds = snapshotConfig?.timerSeconds ?? 9;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    const currentSnapshot = snapshots[currentIndex];
    const totalCount = snapshots.length;
    const isLast = currentIndex >= totalCount - 1;

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

    const handleClose = () => {
        // Mark current as seen then close
        if (currentSnapshot) {
            const snapshotRef = doc(db, 'instantaneas', currentSnapshot.id);
            updateDoc(snapshotRef, {
                isSeen: true,
                seenAt: serverTimestamp(),
            }).catch(() => { });
        }
        onClose();
    };

    /* Animate progress from 0→1 using requestAnimationFrame */
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

    // Auto-advance after timerSeconds
    useEffect(() => {
        const timeout = setTimeout(() => {
            markAsSeenAndAdvance();
        }, timerSeconds * 1000);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timerSeconds, currentIndex]);

    if (!currentSnapshot) return null;

    /* Build a conic-gradient that represents the current progress. */
    const angle = progress * 360;
    const ringGradient = `conic-gradient(
        from -90deg,
        rgba(255,255,255,0.85) ${angle}deg,
        transparent ${angle}deg
    )`;

    return (
        <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Counter badge */}
            {totalCount > 1 && (
                <div className={styles.counter}>
                    {currentIndex + 1} de {totalCount}
                </div>
            )}

            {/* Manual close */}
            <button className={styles.closeBtn} onClick={handleClose} aria-label="Cerrar">
                ✕
            </button>

            <div className={styles.content}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentSnapshot.id}
                        className={styles.photoRing}
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.85, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                    >
                        {/* CSS conic-gradient progress ring */}
                        <div
                            className={styles.progressRingConic}
                            style={{ background: ringGradient }}
                        />

                        {/* Photo wrapper — perfect fit squircle mask */}
                        <div className={styles.photoWrapper}>
                            {/* Pillow clip definition */}
                            <svg height="0" width="0" style={{ position: 'absolute' }}>
                                <defs>
                                    <clipPath clipPathUnits="objectBoundingBox" id="pillowClip">
                                        <path
                                            d="M0.5,0 C0.42,0 0,0.42 0,0.5 C0,0.58 0.42,1 0.5,1 C0.58,1 1,0.58 1,0.5 C1,0.42 0.58,0 0.5,0 Z"
                                            transform="rotate(45 0.5 0.5)"
                                        ></path>
                                    </clipPath>
                                </defs>
                            </svg>

                            {/* Pillow photo */}
                            <img
                                src={currentSnapshot.photoUrl}
                                alt="Instantánea"
                                className={styles.photo}
                            />
                        </div>

                        {/* Message overlay */}
                        {currentSnapshot.message && (
                            <div className={styles.messageOverlay}>
                                <p className={styles.messageText}>{currentSnapshot.message}</p>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
