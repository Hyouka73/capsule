import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './CelebrationOverlay.module.css';

export default function CelebrationOverlay({ 
    onComplete, 
    type = 'confetti', 
    reward, 
    tierLabel, 
    coins, 
    isCombo = false, 
    achievements = [], 
    totalCoins = 0,
    isFullBoard = false
}) {
    const [isVisible, setIsVisible] = useState(true);
    const [phase, setPhase] = useState(isFullBoard ? 'combo' : 'normal'); // normal | combo | epic
    const displayCoins = isCombo ? totalCoins : coins;

    // Phase orchestration for 20/20: Combo (4s) -> Epic (6s) -> Reset
    useEffect(() => {
        if (!isFullBoard) return;
        
        const timerToEpic = setTimeout(() => {
            setPhase('epic');
        }, 4000);

        const timerToReset = setTimeout(() => {
            handleDismiss();
        }, 15000); // 15s for full board

        return () => {
            clearTimeout(timerToEpic);
            clearTimeout(timerToReset);
        };
    }, [isFullBoard]);

    // Simple auto-dismiss for non-fullboard events
    useEffect(() => {
        if (isFullBoard || !isVisible) return;
        const timer = setTimeout(handleDismiss, 15000); // 15s for single line/combo
        return () => clearTimeout(timer);
    }, [isVisible, isFullBoard]);

    const particles = useMemo(() => {
        const count = isCombo || isFullBoard ? 160 : 50;
        return Array.from({ length: count }).map((_, i) => ({
            id: i,
            x: 0,
            y: 0,
            tx: (Math.random() - 0.5) * (window.innerWidth * 1.8),
            ty: - (Math.random() * 500 + 400), 
            gravity: window.innerHeight * 1.8,
            drift: (Math.random() - 0.5) * 500,
            size: Math.random() * (isCombo ? 28 : 20) + 8,
            rotate: Math.random() * 1440,
            delay: Math.random() * 1.2,
            duration: 13 + Math.random() * 4,
            color: [
                '#ffadc7', '#b0f1cc', '#ffd9e3', '#8b4a61', '#ffd700', '#a0e7e5', '#fbe7c6', '#ff69b4'
            ][i % 8]
        }));
    }, [isCombo, isFullBoard]);

    const handleDismiss = () => {
        setIsVisible(false);
        if (onComplete) onComplete();
    };

    // Helper to get achievement title
    const displayTitle = useMemo(() => {
        if (phase === 'epic') return '🏆 LEYENDA DEL AMOR 🏆';
        if (isFullBoard) return '¡META ALCANZADA! 🏁';
        if (isCombo) return '¡SÚPER COMBO! 🎊';
        
        // Single achievement
        const label = achievements[0]?.label || tierLabel || '¡LOGRO!';
        return `¡FELICIDADES! 🎉\n${label.replace(' ✅', '').replace(' 🏆', '').replace(' ✨', '')}`;
    }, [phase, isFullBoard, isCombo, achievements, tierLabel]);

    return (
        <AnimatePresence>
            {isVisible && (
                <div className={`${styles.container} ${phase === 'epic' ? styles.fullBoardMode : ''}`}>
                    {particles.map((p) => (
                        <motion.div
                            key={p.id}
                            className={styles.particle}
                            initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                            animate={{
                                x: [0, p.tx, p.tx + p.drift],
                                y: [0, p.ty, p.gravity],
                                scale: [0, 1.5, 1, 0],
                                rotate: p.rotate,
                                opacity: [1, 1, 1, 0]
                            }}
                            transition={{
                                duration: p.duration,
                                ease: [0.22, 1, 0.36, 1],
                                delay: p.delay
                            }}
                            style={{
                                width: p.size,
                                height: p.size,
                                backgroundColor: p.color,
                                borderRadius: p.id % 3 === 0 ? '4px' : (p.id % 3 === 1 ? '50%' : '2px'),
                            }}
                        />
                    ))}

                    <motion.div
                        key={phase} /* Re-animate when phase changes */
                        className={`${styles.hero} ${isCombo || isFullBoard ? styles.heroCombo : ''}`}
                        initial={{ scale: 0, opacity: 0, y: 40 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: 'spring', damping: 12, stiffness: 100 }}
                    >
                        {/* Only show "BINGO" on full board completion */}
                        {(phase === 'epic' || (isFullBoard && phase === 'combo')) && (
                            <motion.h1 
                                className={styles.bingoTitle}
                                animate={{ 
                                    scale: [1, 1.2, 1], 
                                    rotate: [-5, 5, -5] 
                                }}
                                transition={{ duration: 0.4, repeat: Infinity, repeatType: 'reverse' }}
                            >
                                ¡BINGO! 🎈
                            </motion.h1>
                        )}

                        <div className={`${styles.rewardCard} ${isCombo || isFullBoard ? styles.rewardCardCombo : ''}`}>
                            {isFullBoard && (
                                <h2 className={styles.tierLabel}>
                                    {displayTitle}
                                </h2>
                            )}
                            
                            {isFullBoard && phase !== 'epic' && achievements.length > 1 && (
                                <ul className={styles.achievementList}>
                                    {achievements.map((ac, idx) => (
                                        <motion.li 
                                            key={idx} 
                                            className={styles.achievementItem}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3 + (idx * 0.1) }}
                                        >
                                            <span className={styles.acLabel}>{ac.label}</span>
                                            <span className={styles.acCoins}>+{ac.coins}</span>
                                        </motion.li>
                                    ))}
                                </ul>
                            )}

                            <div className={`${styles.coinsAmount} ${isCombo || isFullBoard ? styles.coinsAmountCombo : ''}`}>
                                <span className={`material-symbols-outlined ${styles.coinIcon}`}>monetization_on</span>
                                <span className={styles.coinsValue}>+{displayCoins}</span>
                            </div>

                            {isFullBoard && phase !== 'epic' && <div className={styles.totalBadge}>TOTAL GANADO</div>}

                            <p className={styles.rewardText}>
                                {isFullBoard 
                                    ? (phase === 'epic' ? '¡Eres increíble! Has llenado todo el tablero. ✨' : reward)
                                    : ''}
                            </p>

                            <button className={styles.dismissBtn} onClick={handleDismiss}>
                                {isFullBoard && phase === 'epic' ? '¡A POR EL SIGUIENTE! ✨' : '¡Genial! 💖'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
