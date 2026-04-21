import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../../../components/ui/ConfirmModal/ConfirmModal';
import styles from '../UserBingo.module.css';

/**
 * Renders the visual content of a square (Emoji, SVG Icon, or Fallback).
 */
const SquareIcon = ({ square }) => {
    // 1. Emoji priority (1.8rem)
    if (square.emoji) {
        return <span className={styles.emoji}>{square.emoji}</span>;
    }
    
    // 2. SVG Icon support
    if (square.icon) {
        // If it's a Material Symbol name as a string (fallback safety)
        if (typeof square.icon === 'string') {
            return <span className="material-symbols-rounded" style={{ fontSize: '1.8rem' }}>{square.icon}</span>;
        }
        // If it's a functional component or raw SVG
        const Icon = square.icon;
        return <Icon className={styles.svgIcon} />;
    }

    // 3. Fallback visible "?"
    return <span className={styles.fallback}>?</span>;
};

export default function BingoBoardGrid({ 
    categories, 
    isLoading, 
    onSquareClick, 
    bingoQueue = [], 
    resolveBingoSuggestion, 
    completeBingoSquare 
}) {
    const [confirmingSquare, setConfirmingSquare] = useState(null);

    if (isLoading && categories.length === 0) {
        return (
            <div className={styles.boardCard}>
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Cargando tablero...
                </div>
            </div>
        );
    }

    return (
        <div className={styles.boardCard}>
            <div className={styles.grid}>
                {categories.filter(s => s.isEnabled !== false).map((square, index) => {
                    const matchedPending = bingoQueue.find(p => p.suggestions.some(s => s.categoryId === square.id));
                    const isCompleted = !!square.completedMemoryId;
                    const isSpecial = !!square.isSpecial;

                    return (
                        <motion.div
                            key={square.id}
                            className={`${styles.square} ${isCompleted ? styles.completed : ''} ${isSpecial ? styles.special : ''} ${square.isPendingSync ? styles.pendingSync : ''}`}
                            onClick={() => onSquareClick(square)}
                            whileTap={{ scale: 0.95 }}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.02 }}
                        >
                            {/* Completion Marker (Check or Sync) */}
                            <AnimatePresence>
                                {(isCompleted || square.isPendingSync) && (
                                    <motion.div 
                                        className={`${styles.checkMark} ${square.isPendingSync ? styles.pendingCheck : ''}`}
                                        initial={{ scale: 0, rotate: -45 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        exit={{ scale: 0, opacity: 0, rotate: 45 }}
                                        transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                                    >
                                        <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>
                                            {square.isPendingSync ? 'sync' : 'check'}
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {matchedPending && !isCompleted && (
                                <div className={styles.suggestionIndicator}>
                                    <span 
                                        className="material-symbols-rounded" 
                                        style={{ color: 'var(--primary)', fontSize: '1.4rem', fontVariationSettings: "'FILL' 1" }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmingSquare({ squareId: square.id, memoryId: matchedPending.memoryId });
                                        }}
                                    >
                                        lightbulb
                                    </span>
                                </div>
                            )}

                            <div className={styles.squareContent}>
                                <SquareIcon square={square} />
                                
                                <span className={styles.squareTitle}>
                                    {square.title || 'Misterio'}
                                </span>
                            </div>

                            {isSpecial && (
                                <div className={styles.specialStar} title="Casilla Especial (+5 monedas)">
                                    ⭐
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            <ConfirmModal
                isOpen={!!confirmingSquare}
                title="¿Marcar esta casilla?"
                message="Tienes una cita que cumple con este reto."
                confirmText="¡Sí, marcar!"
                cancelText="Ahora no"
                onConfirm={() => {
                    if (resolveBingoSuggestion) {
                        resolveBingoSuggestion(confirmingSquare.memoryId, [confirmingSquare.squareId]);
                    } else if (completeBingoSquare) {
                        // Fallback for direct completion if resolve fn not passed
                        completeBingoSquare(confirmingSquare.squareId, confirmingSquare.memoryId);
                    }
                    setConfirmingSquare(null);
                }}
                onCancel={() => {
                    // Just close, don't auto-resolve/dismiss without user action
                    setConfirmingSquare(null);
                }}
                emoji="🎯"
            />
        </div>
    );
}
