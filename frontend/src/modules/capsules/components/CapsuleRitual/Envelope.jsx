import { motion } from 'framer-motion';
import styles from './Envelope.module.css';

/**
 * Envelope Sub-components v5.0 — THE SANDWICH.
 * This architecture ensures that Back, Front, and Flap share the exact same 
 * coordinate system while allowing the content to be placed between them.
 */

export function EnvelopeBack({ layoutId }) {
    return (
        <motion.div layoutId={layoutId} className={styles.envelopeContainer}>
            <div className={styles.envelopeReal}>
                <div className={styles.backPanel} />
            </div>
        </motion.div>
    );
}

export function EnvelopeFront({ layoutId }) {
    return (
        <motion.div layoutId={layoutId} className={styles.envelopeContainer}>
            <div className={styles.envelopeReal}>
                <div className={styles.frontPanel}>
                    <div className={styles.vShapeLeft} />
                    <div className={styles.vShapeRight} />
                </div>
            </div>
        </motion.div>
    );
}

export function EnvelopeFlap({ isOpen, onFlapComplete, layoutId }) {
    const flapVariants = {
        closed: { rotateX: 0, zIndex: 10 },
        open: { 
            rotateX: 180, 
            zIndex: 1,
            transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
        }
    };

    return (
        <motion.div layoutId={layoutId} className={styles.envelopeContainer}>
            <div className={styles.envelopeReal}>
                <motion.div 
                    className={styles.topFlap}
                    variants={flapVariants}
                    initial="closed"
                    animate={isOpen ? "open" : "closed"}
                    onAnimationComplete={(definition) => {
                        if (definition === "open" && onFlapComplete) {
                            onFlapComplete();
                        }
                    }}
                >
                    <div className={styles.flapInner} />
                </motion.div>
            </div>
        </motion.div>
    );
}

// Default export for backward compatibility or simple usage
export default function Envelope({ isOpen, onFlapComplete, layoutId, hideFront, hideBack }) {
    return (
        <div className={styles.envelopeContainer}>
            {!hideBack && <EnvelopeBack layoutId={`${layoutId}-back`} />}
            {!hideFront && <EnvelopeFront layoutId={`${layoutId}-front`} />}
            <EnvelopeFlap isOpen={isOpen} onFlapComplete={onFlapComplete} layoutId={`${layoutId}-flap`} />
        </div>
    );
}
