import React from 'react';
import { motion } from 'framer-motion';
import styles from '../UserBingo.module.css';

export default function BingoBoardGrid({ categories, isLoading, onSquareClick }) {
    if (isLoading && categories.length === 0) {
        return (
            <div className={styles.boardCard}>
                <div className={styles.loading}>Cargando tablero...</div>
            </div>
        );
    }

    return (
        <div className={styles.boardCard}>
            <div className={styles.grid}>
                {categories.map((square) => (
                    <motion.div
                        key={square.id}
                        className={`${styles.square} ${square.completedMemoryId ? styles.completed : styles.empty}`}
                        whileTap={square.completedMemoryId ? { scale: 1.05 } : { scale: 0.95, boxShadow: "0 4px 12px rgba(97,218,190,0.4)" }}
                        transition={square.completedMemoryId ? { type: "spring", stiffness: 400, damping: 20 } : { duration: 0.15 }}
                        onClick={() => onSquareClick(square)}
                    >
                        {square.completedMemoryId ? (
                            <div className={styles.completedContent}>
                                <span className={`material-symbols-outlined ${styles.checkIcon}`}>check_circle</span>
                                <span className={styles.dateBadge}>
                                    {new Date(square.completedAt)
                                        .toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                                        .replace('.', '')}
                                </span>
                            </div>
                        ) : (
                            <div className={styles.emptyContent}>
                                {square.emoji ? (
                                     <span className={styles.emojiIcon}>{square.emoji}</span>
                                ) : (
                                    <span className={`material-symbols-outlined ${styles.emptyIcon}`}>help_outline</span>
                                )}
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
