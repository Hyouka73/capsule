import { motion, useMotionValue, useTransform } from 'framer-motion';
import styles from './LetterReveal.module.css';

/**
 * LetterReveal v6.0 — Sincronizado con el Ritual.
 * @param {string} content - El mensaje de amor.
 * @param {string} title - El título de la cápsula.
 * @param {boolean} isUnfolded - Controla cuándo se abren los pliegos (desde CapsuleRitual).
 */
export default function LetterReveal({ content, title, isUnfolded }) {
    // 1. Motion Values for precise control
    const topRotation = useMotionValue(-179);
    const bottomRotation = useMotionValue(179);

    // 2. Dynamic Shadow Mapping
    const topShadowOpacity = useTransform(topRotation, [-179, -90, 0], [0.3, 0.1, 0]);
    const bottomShadowOpacity = useTransform(bottomRotation, [179, 90, 0], [0.3, 0.1, 0]);

    // 3. Fold Animation Variants (Aumentado el delay para que ocurra tras el centrado)
    const topFoldVariants = {
        closed: { rotateX: -179 },
        open: { 
            rotateX: 0, 
            transition: { 
                duration: 1.2, 
                ease: [0.22, 1, 0.36, 1],
                delay: 0.2 // Pequeño delay tras llegar al centro
            }
        }
    };

    const bottomFoldVariants = {
        closed: { rotateX: 179 },
        open: { 
            rotateX: 0, 
            transition: { 
                duration: 1.3, 
                ease: [0.22, 1, 0.36, 1], 
                delay: 0.4 
            }
        }
    };

    return (
        <motion.div className={styles.letterMover}>
            <div className={styles.letterWrapper}>
                {/* PANEL CENTRAL */}
                <div className={`${styles.pnlMiddle} ${styles.parchmentBase}`}>
                    <div className={styles.contentMain}>{content}</div>

                    {/* PLIEGO SUPERIOR */}
                    <motion.div 
                        className={`${styles.pnlTop} ${styles.parchmentBase}`}
                        style={{ rotateX: topRotation }}
                        variants={topFoldVariants}
                        initial="closed"
                        animate={isUnfolded ? "open" : "closed"}
                    >
                        <motion.div 
                            className={styles.foldShadow} 
                            style={{ opacity: topShadowOpacity }} 
                        />
                        {title && <h2 className={styles.title}>{title}</h2>}
                    </motion.div>

                    {/* PLIEGO INFERIOR */}
                    <motion.div 
                        className={`${styles.pnlBottom} ${styles.parchmentBase}`}
                        style={{ rotateX: bottomRotation }}
                        variants={bottomFoldVariants}
                        initial="closed"
                        animate={isUnfolded ? "open" : "closed"}
                    >
                        <motion.div 
                            className={styles.foldShadowBottom} 
                            style={{ opacity: bottomShadowOpacity }} 
                        />
                        <div className={styles.signature}>Con amor, ❤️</div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}
