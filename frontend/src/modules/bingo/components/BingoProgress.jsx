import React from 'react';
import { motion } from 'framer-motion';
import styles from '../UserBingo.module.css';

export default function BingoProgress({ completedCount, totalCount = 16 }) {
    const beads = Array.from({ length: totalCount });

    return (
        <div className={styles.progressContainer}>
            <div className={styles.progressLabel}>
                {completedCount} de {totalCount} Retos
            </div>
            <div className={styles.beadTrack}>
                <motion.div 
                    className={styles.progressFill}
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedCount / totalCount) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                >
                    <motion.div 
                        className={styles.marker}
                        animate={{ 
                            scale: [1, 1.2, 1],
                            rotate: [0, 10, -10, 0]
                        }}
                        transition={{ 
                            repeat: Infinity, 
                            duration: 2,
                            ease: "easeInOut"
                        }}
                    >
                        ❤️
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
