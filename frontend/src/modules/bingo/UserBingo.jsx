import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button/Button';
import styles from './UserBingo.module.css';

// Mock Data para el usuario (Solo lectura visual)
const BINGO_SQUARES = Array(20).fill(null).map((_, i) => {
    // Simularemos algunas completadas y otras no
    const isCompleted = [0, 3, 5, 8, 12, 17, 19].includes(i);
    return {
        id: i.toString(),
        title: isCompleted ? `Misión ${i + 1}` : 'Misión Secreta',
        emoji: isCompleted ? '✨' : '❔',
        isCompleted,
        memoryPhoto: isCompleted && i % 2 === 0 ? 'https://images.unsplash.com/photo-1549468057-5b6fb89cf61a?auto=format&fit=crop&q=80' : null,
        completedAt: isCompleted ? new Date().toISOString() : null,
        description: isCompleted ? 'Día de picnic en el parque central' : 'Completa más misiones para descubrir qué es.',
    };
});

export default function UserBingo() {
    const [selectedSquare, setSelectedSquare] = useState(null);
    const completedCount = BINGO_SQUARES.filter(s => s.isCompleted).length;
    const progressPerc = (completedCount / 20) * 100;

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <h1 className={styles.title}>Nuestro Bingo</h1>
                <p className={styles.subtitle}>Aventuras juntos por desbloquear.</p>
            </div>

            {/* Barra de progreso */}
            <div className={styles.progressContainer}>
                <div className={styles.progressText}>
                    <span>Progreso del año</span>
                    <span>{completedCount} / 20</span>
                </div>
                <div className={styles.progressBarBg}>
                    <motion.div
                        className={styles.progressBarFill}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPerc}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                    />
                </div>
            </div>

            {/* Tablero 4x5 */}
            <div className={styles.boardCard}>
                <div className={styles.grid}>
                    {BINGO_SQUARES.map((square) => (
                        <div
                            key={square.id}
                            className={`${styles.square} ${square.isCompleted ? styles.completed : styles.empty}`}
                            onClick={() => {
                                if (square.isCompleted) setSelectedSquare(square);
                            }}
                        >
                            {square.isCompleted ? (
                                <motion.div
                                    className={styles.completedContent}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <span className={styles.emoji}>{square.emoji}</span>
                                    {/* Si tiene foto, mostramos un iconito de polaroid o badge */}
                                    {square.memoryPhoto && (
                                        <div className={styles.photoBadge}>📸</div>
                                    )}
                                    <div className={styles.stampOverlay}>HECHO</div>
                                </motion.div>
                            ) : (
                                <div className={styles.emptyContent}>
                                    <span className={styles.emptyIcon}>❔</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <p className={styles.footerHint}>Toca las casillas marcadas para recordar ese momento.</p>

            {/* Modal de Detalle (Polaroid) */}
            <AnimatePresence>
                {selectedSquare && (
                    <motion.div
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedSquare(null)}
                    >
                        <motion.div
                            className={styles.polaroid}
                            initial={{ scale: 0.8, rotate: -5 }}
                            animate={{ scale: 1, rotate: 2 }}
                            exit={{ scale: 0.8, rotate: -5, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button className={styles.closeBtn} onClick={() => setSelectedSquare(null)}>×</button>

                            <div className={styles.photoArea}>
                                {selectedSquare.memoryPhoto ? (
                                    <img src={selectedSquare.memoryPhoto} alt="Memoria" className={styles.memoryImg} />
                                ) : (
                                    <div className={styles.noPhotoDefault}>
                                        <span className={styles.bigEmoji}>{selectedSquare.emoji}</span>
                                    </div>
                                )}
                            </div>

                            <div className={styles.polaroidText}>
                                <h2>{selectedSquare.title}</h2>
                                <p>{selectedSquare.description}</p>
                                <span className={styles.dateStamp}>
                                    {new Date(selectedSquare.completedAt).toLocaleDateString()}
                                </span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
