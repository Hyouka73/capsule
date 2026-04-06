import { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import styles from './WaxSeal.module.css';

/**
 * WaxSeal — El sello interactivo que debe romperse por presión.
 * @param {Function} onBreak - Callback cuando el sello se rompe tras la presión.
 */
export default function WaxSeal({ onBreak }) {
    const [isPressing, setIsPressing] = useState(false);
    const [progress, setProgress] = useState(0); // 0 a 100
    const controls = useAnimation();
    const timerRef = useRef(null);

    const PRESS_DURATION = 1200; // 1.2 segundos para romper

    // Manejo de la vibración dinámica
    useEffect(() => {
        if (isPressing && progress < 100) {
            // Aumentar intensidad según el progreso
            const intensity = 1 + (progress / 20); // de 1px a 6px
            controls.start({
                x: [-intensity, intensity, -intensity],
                rotate: [-intensity/2, intensity/2, -intensity/2],
                transition: { 
                    duration: 0.05, 
                    repeat: Infinity,
                    ease: "linear"
                }
            });

            // Timer de progreso
            const startTime = Date.now() - (progress * PRESS_DURATION / 100);
            timerRef.current = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const newProgress = Math.min(100, (elapsed / PRESS_DURATION) * 100);
                setProgress(newProgress);

                // HAPTICS: Micro-vibraciones de tensión (si el navegador lo permite)
                if (window.navigator && window.navigator.vibrate && Math.random() > 0.8) {
                    window.navigator.vibrate(5); 
                }

                if (newProgress >= 100) {
                    clearInterval(timerRef.current);
                    setIsPressing(false);
                    // HAPTICS: Pulso final de ruptura
                    if (window.navigator && window.navigator.vibrate) {
                        window.navigator.vibrate([40, 20, 40]);
                    }
                    onBreak(); // ¡BAM! Se rompió
                }
            }, 16); // ~60fps logic
        } else {
            controls.stop();
            controls.set({ x: 0, rotate: 0 });
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPressing, controls, onBreak]);

    const handleStart = () => {
        if (progress < 100) setIsPressing(true);
    };

    const handleEnd = () => {
        setIsPressing(false);
        if (progress < 100) setProgress(0);
    };

    return (
        <div 
            className={styles.sealContainer}
            onPointerDown={handleStart}
            onPointerUp={handleEnd}
            onPointerLeave={handleEnd}
            style={{ touchAction: 'none' }}
        >
            {/* Brillo de carga alrededor del sello */}
            <svg className={styles.progressRing} width="80" height="80">
                <circle
                    className={styles.progressCircle}
                    stroke="var(--ritual-accent-rose)"
                    strokeWidth="4"
                    fill="transparent"
                    r="36"
                    cx="40"
                    cy="40"
                    style={{
                        strokeDasharray: '226',
                        strokeDashoffset: 226 - (226 * progress) / 100,
                        opacity: isPressing ? 1 : 0
                    }}
                />
            </svg>

            <motion.div
                className={styles.seal}
                animate={controls}
                whileTap={{ scale: 0.9 }}
            >
                <div className={styles.sealHeart}>❤️</div>
                {/* Micro-destellos internos cuando se presiona */}
                {isPressing && (
                    <motion.div 
                        className={styles.glow}
                        animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                    />
                )}
            </motion.div>
            
            <p className={styles.hint}>
                {isPressing ? '¡No lo sueltes!' : 'Mantén presionado para abrir'}
            </p>
        </div>
    );
}
