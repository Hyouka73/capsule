import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppConfig } from '../../../hooks/useAppConfig';
import { useSnapshots } from '../hooks/useSnapshots';
import styles from './SnapshotOverlay.module.css';

/**
 * SnapshotOverlay — Muestra el mazo de fotos sin ver.
 */
const DECK_VISIBLE = 3;
const SLOT_OFFSET_X = 22;   
const SLOT_OFFSET_Y = -18;  
const SLOT_SCALE   = 0.07;  

// SQUIRCLE PATH — NO MODIFICAR
const squirclePath = "M0.5,0 C0.42,0 0,0.42 0,0.5 C0,0.58 0.42,1 0.5,1 C0.58,1 1,0.58 1,0.5 C1,0.42 0.58,0 0.5,0 Z";

export default function SnapshotOverlay({ snapshots = [], onClose }) {
    const { snapshotConfig } = useAppConfig();
    const { markAsSeen } = useSnapshots();
    const timerSeconds = snapshotConfig?.timerSeconds ?? 8;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [isAdvancing, setIsAdvancing] = useState(false);

    const totalCount = snapshots.length;
    const currentSnapshot = snapshots[currentIndex];
    const isLast = currentIndex >= totalCount - 1;

    const markAsSeenAndAdvance = useCallback(() => {
        if (!currentSnapshot || isFinished || isAdvancing) return;

        // 1. Marcar como visto (Optimista vía hook)
        markAsSeen(currentSnapshot.id);

        // 2. Avanzar UI de inmediato
        setIsAdvancing(true);

        if (isLast) {
            setIsFinished(true);
            if (onClose) onClose(true, true); // shouldReply, isEarly
            
            setTimeout(() => {
                onClose(false); 
            }, 1800);
        } else {
            // Delay mínimo para dejar que la animación de la tarjeta actual empiece
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setProgress(0);
                setIsAdvancing(false);
            }, 50);
        }
    }, [currentSnapshot, isLast, isFinished, isAdvancing, onClose, markAsSeen]);

    const handleClose = () => {
        if (currentSnapshot && !isFinished) {
            markAsSeen(currentSnapshot.id);
        }
        onClose(false);
    };

    /* Progress Timer & Auto-advance */
    useEffect(() => {
        // PAUSA: Si no hay snapshot, o ya terminó, o si la foto NO ESTÁ LISTA (descargando)
        if (isFinished || isAdvancing || (currentSnapshot && !currentSnapshot.isReady)) {
            return;
        }
        
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
            } else {
                setProgress(1);
                markAsSeenAndAdvance();
            }
        };

        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [timerSeconds, currentIndex, isFinished, isAdvancing, currentSnapshot?.isReady, markAsSeenAndAdvance]);

    if (!currentSnapshot && !isFinished) return null;

    const deckSlots = [];
    if (!isFinished) {
        for (let slot = 0; slot < DECK_VISIBLE; slot++) {
            const snapIdx = currentIndex + slot;
            if (snapIdx < totalCount) {
                deckSlots.push({ slot, snap: snapshots[snapIdx] });
            }
        }
    }
    const deckSlotsReversed = [...deckSlots].reverse();

    return (
        <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className={styles.backdrop} onClick={markAsSeenAndAdvance} />

            <div className={styles.topBar}>
                {totalCount > 1 && !isFinished && (
                    <div className={styles.counter}>
                        {currentIndex + 1} de {totalCount}
                    </div>
                )}
                <button className={styles.closeBtn} onClick={handleClose}>✕</button>
            </div>

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
                        
                        // Subtler fanned stack logic
                        const isEven = slot % 2 === 0;
                        const direction = isEven ? 1 : -1;
                        
                        // Sweet spot for the fanned stack
                        const tx = isActive ? 0 : (slot * 22 * direction);
                        const ty = isActive ? 0 : (slot * -24);
                        const sc = 1 - slot * 0.04;
                        const zIndex = DECK_VISIBLE - slot;
                        const opacity = 1 - (slot * 0.15);

                        return (
                            <motion.div
                                key={snap.id}
                                className={styles.cardSlot}
                                style={{ zIndex }}
                                initial={{ 
                                    x: tx, 
                                    y: ty + 10, 
                                    scale: sc - 0.02, 
                                    opacity: 0, 
                                    rotate: slot * 2 * direction 
                                }}
                                animate={{ 
                                    x: tx, 
                                    y: ty, 
                                    scale: sc, 
                                    opacity, 
                                    rotate: slot * -1.5 * direction 
                                }}
                                exit={{ 
                                    x: -300 * direction, 
                                    y: 100, 
                                    opacity: 0, 
                                    rotate: -25 * direction, 
                                    scale: 0.8 
                                }}
                                transition={{ 
                                    type: 'spring', 
                                    stiffness: 260, 
                                    damping: 30,
                                    opacity: { duration: 0.2 }
                                }}
                                onClick={(e) => {
                                    if (isActive) {
                                        e.stopPropagation();
                                        markAsSeenAndAdvance();
                                    }
                                }}
                            >
                                <div className={styles.photoWrapper}>
                                    <div className={styles.photoInner}>
                                        {snap.isReady ? (
                                            <>
                                                <img src={snap.photoUrl} alt="" className={styles.photo} />
                                                {isActive && (snap.message || snap.caption) && (
                                                    <div className={styles.messageOverlay}>
                                                        <p className={styles.messageText}>{snap.message || snap.caption}</p>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className={styles.loadingState}>
                                                <div className={styles.spinner}>✨</div>
                                                <p>Revelando instantánea...</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {isActive && (
                                    <svg className={styles.progressRingSvg} viewBox="0 0 1 1">
                                        <path 
                                            d={squirclePath} 
                                            className={styles.timerTrack} 
                                            transform="rotate(45 0.5 0.5)" 
                                        />
                                        <motion.path 
                                            d={squirclePath} 
                                            className={styles.timerFill} 
                                            transform="rotate(45 0.5 0.5)" 
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: progress >= 0.99 ? 1.05 : progress }}
                                            transition={{ 
                                                pathLength: { type: "tween", ease: "linear", duration: 0 }
                                            }}
                                        />
                                    </svg>
                                )}
                            </motion.div>
                        );
                    })}

                    {isFinished && (
                        <motion.div
                            key="reply-prompt"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={styles.replyPrompt}
                        >
                            <div className={styles.tulipIcon}>🌷</div>
                            <h3>¡Qué lindo momento!</h3>
                            <p>¿Quieres responder con uno tú?</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
