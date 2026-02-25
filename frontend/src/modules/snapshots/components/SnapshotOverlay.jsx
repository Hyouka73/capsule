import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { useAppConfig } from '../../../context/AppConfigContext';
import styles from './SnapshotOverlay.module.css';

export default function SnapshotOverlay({ snapshot, onClose }) {
    const { snapshotConfig } = useAppConfig();
    const timerSeconds = snapshotConfig?.timerSeconds ?? 9;
    const [progress, setProgress] = useState(0);

    const handleClose = async () => {
        try {
            const snapshotRef = doc(db, 'instantaneas', snapshot.id);
            await updateDoc(snapshotRef, {
                isSeen: true,
                seenAt: serverTimestamp(),
            });
            onClose();
        } catch (err) {
            console.error('Error marking snapshot as seen:', err);
            onClose();
        }
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
    }, [timerSeconds]);

    // Auto-close after timerSeconds
    useEffect(() => {
        const timeout = setTimeout(() => {
            handleClose();
        }, timerSeconds * 1000);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timerSeconds]);

    /* Build a conic-gradient that represents the current progress.
       The gradient sweeps from the top (-90deg / 270deg start). */
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
            {/* Manual close */}
            <button className={styles.closeBtn} onClick={handleClose} aria-label="Cerrar">
                ✕
            </button>

            <div className={styles.content}>
                <motion.div
                    className={styles.photoRing}
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
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
                            src={snapshot.photoUrl}
                            alt="Instantánea"
                            className={styles.photo}
                        />
                    </div>

                    {/* Message overlay */}
                    {snapshot.message && (
                        <div className={styles.messageOverlay}>
                            <p className={styles.messageText}>{snapshot.message}</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );
}
