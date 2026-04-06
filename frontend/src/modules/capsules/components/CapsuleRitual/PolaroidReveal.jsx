import { useRef } from 'react';
import { motion } from 'framer-motion';
import styles from './PolaroidReveal.module.css';

/**
 * PolaroidReveal — Una sola foto que sale como una instantánea física.
 * @param {Object} file - El objeto del archivo de imagen (url, fileName).
 * @param {string} caption - El texto acompañante opcional.
 */
export default function PolaroidReveal({ file, caption }) {
    // Rotación aleatoria sutil fija para naturalidad
    const rotationRef = useRef((Math.random() * 10) - 5);
    const rotation = rotationRef.current;

    return (
        <motion.div 
            className={styles.polaroid}
            initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
            animate={{ opacity: 1, scale: 1, rotate: rotation }}
            transition={{ 
                type: 'spring', 
                damping: 18, 
                stiffness: 120,
                delay: 0.3 
            }}
        >
            <div className={styles.photoContainer}>
                <img src={file.url} alt={file.fileName} className={styles.image} />
            </div>
            {caption && (
                <div className={styles.caption}>
                    {caption}
                </div>
            )}
        </motion.div>
    );
}
