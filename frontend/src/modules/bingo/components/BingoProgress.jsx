import React from 'react';
import { motion } from 'framer-motion';
import styles from '../UserBingo.module.css';

export default function BingoProgress({ completedCount, totalCount = 16 }) {
    const beads = Array.from({ length: totalCount });

    return (
        <div className={styles.progressContainer}>
            <div className={styles.progressLabel}>
                {completedCount} de {totalCount} Marcados
            </div>
            <div className={styles.beadTrack}>
                {beads.map((_, i) => (
                    <motion.div
                        key={i}
                        className={`${styles.bead} ${i < completedCount ? styles.beadActive : ''}`}
                        initial={false}
                        animate={{
                            scale: i < completedCount ? 1.3 : 1,
                            y: i < completedCount ? [0, -6, 0] : 0
                        }}
                        transition={{
                            duration: 0.5,
                            delay: i < completedCount ? i * 0.04 : 0
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
