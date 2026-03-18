import React from 'react';
import { motion } from 'framer-motion';
import styles from '../UserBingo.module.css';

export default function BingoProgress({ progressPercent, completedCount, totalCount }) {
    return (
        <div className={styles.progressContainer}>
            <div className={styles.progressBarBg}>
                <motion.div
                    className={styles.progressBarFill}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            </div>
            <div className={styles.progressBadge}>
                {completedCount}/{totalCount}
            </div>
        </div>
    );
}
