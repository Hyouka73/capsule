import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './CelebrationOverlay.module.css';

export default function CelebrationOverlay({ onComplete, type = 'confetti', reward, tierLabel, coins }) {
    const [isVisible, setIsVisible] = useState(true);

    const particles = useMemo(() => {
        return Array.from({ length: 50 }).map((_, i) => ({
            id: i,
            x: 0,
            y: 0,
            tx: (Math.random() - 0.5) * (window.innerWidth * 1.5),
            ty: - (Math.random() * 300 + 200), 
            gravity: window.innerHeight * 1.5,
            drift: (Math.random() - 0.5) * 300,
            size: Math.random() * 20 + 8,
            rotate: Math.random() * 720,
            delay: Math.random() * 0.4,
            duration: 2.5 + Math.random() * 2,
            color: [
                '#ffadc7',
                '#b0f1cc',
                '#ffd9e3',
                '#8b4a61',
                '#ffd700'
            ][i % 5]
        }));
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        if (onComplete) onComplete();
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <div className={styles.container}>
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
                                borderRadius: p.id % 2 === 0 ? '4px' : '50%',
                            }}
                        />
                    ))}

                    <motion.div
                        className={styles.hero}
                        initial={{ scale: 0, opacity: 0, y: 40 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: 'spring', damping: 12, stiffness: 100 }}
                    >
                        <motion.h1 
                            className={styles.bingoTitle}
                            animate={{ scale: [1, 1.1, 1], rotate: [-3, 3, -3] }}
                            transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
                        >
                            ¡BINGO!
                        </motion.h1>

                        <div className={styles.rewardCard}>
                            <h2 className={styles.tierLabel}>{tierLabel || '¡Tablero Completo!'}</h2>
                            
                            <span className={`material-symbols-outlined ${styles.rewardIcon}`}>
                                {reward ? 'card_giftcard' : 'stars'}
                            </span>

                            {coins > 0 && (
                                <div className={styles.coinsText}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>monetization_on</span>
                                    + {coins} Monedas
                                </div>
                            )}

                            {reward && (
                                <p style={{ fontSize: '1rem', color: '#847377', fontWeight: '600', margin: 0 }}>
                                    ¡Premio Especial Desbloqueado! 💝
                                </p>
                            )}

                            <button className={styles.dismissBtn} onClick={handleDismiss}>
                                ¡Genial!
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
