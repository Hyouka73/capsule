import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './CelebrationOverlay.module.css';

/**
 * CelebrationOverlay — Spawns a burst of particles.
 * Designed to be rendered at the root of the module to avoid clipping.
 * Self-cleans after the animation duration.
 */
export default function CelebrationOverlay({ onComplete, type = 'confetti' }) {
    const [isVisible, setIsVisible] = useState(true);

    const particles = useMemo(() => {
        return Array.from({ length: 40 }).map((_, i) => ({
            id: i,
            x: 0,
            y: 0,
            tx: (Math.random() - 0.5) * (window.innerWidth * 0.8),
            ty: - (Math.random() * 200 + 100), // Initial upward burst
            gravity: window.innerHeight * 1.2, // Fall distance
            drift: (Math.random() - 0.5) * 200,
            size: Math.random() * 15 + 10,
            rotate: Math.random() * 720,
            delay: Math.random() * 0.2,
            duration: 2 + Math.random() * 1.5,
            color: [
                'var(--pastel-rose)',
                'var(--pastel-mint)',
                'var(--pastel-peach)',
                'var(--pastel-lavender)',
                'var(--pastel-blue)'
            ][i % 5]
        }));
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            if (onComplete) onComplete();
        }, 4000);
        return () => clearTimeout(timer);
    }, [onComplete]);

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
                                scale: [0, 1.2, 0.8, 0],
                                rotate: p.rotate,
                                opacity: [1, 1, 1, 0]
                            }}
                            transition={{
                                duration: p.duration,
                                ease: [0.22, 1, 0.36, 1], // Custom overshoot -> fall
                                delay: p.delay
                            }}
                            style={{
                                width: p.size,
                                height: p.size,
                                backgroundColor: p.color,
                                borderRadius: p.id % 2 === 0 ? 'var(--radius-xs)' : '50%',
                            }}
                        />
                    ))}
                    {/* Centered Large Heart/Star */}
                    <motion.div
                        className={styles.hero}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }}
                        transition={{ duration: 1, ease: 'backOut' }}
                    >
                        ✨
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
