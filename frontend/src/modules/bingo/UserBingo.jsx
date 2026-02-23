import { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button/Button';
import BingoStartModal from '../../components/Bingo/BingoStartModal';
import PhotoViewer from '../../components/ui/PhotoViewer/PhotoViewer';
import { subscribeToGlobalSettings } from '../../services/settingsService';
import styles from './UserBingo.module.css';

import { BINGO_SQUARES } from '../../data/bingoData';

export default function UserBingo({ setActiveTab, setBingoContextToMap, setIsModalOpen }) {
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [selectedStartSquare, setSelectedStartSquare] = useState(null);
    const [viewerPhotos, setViewerPhotos] = useState(null);
    const [globalSettings, setGlobalSettings] = useState(null);

    useEffect(() => {
        const unsub = subscribeToGlobalSettings(data => {
            if (data) setGlobalSettings(data);
        });
        return unsub;
    }, []);
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
                <div className={styles.progressBarBg}>
                    <motion.div
                        className={styles.progressBarFill}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPerc}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                </div>
                <div className={styles.progressBadge}>
                    {completedCount}/{BINGO_SQUARES.length}
                </div>
            </div>

            {/* Tablero 4x5 */}
            <div className={styles.boardCard}>
                <div className={styles.grid}>
                    {BINGO_SQUARES.map((square) => (
                        <motion.div
                            key={square.id}
                            className={`${styles.square} ${square.isCompleted ? styles.completed : styles.empty}`}
                            whileTap={square.isCompleted ? { scale: 1.05 } : { scale: 0.95, boxShadow: "0 4px 12px rgba(97,218,190,0.4)" }}
                            transition={square.isCompleted ? { type: "spring", stiffness: 400, damping: 20 } : { duration: 0.15 }}
                            onClick={() => {
                                if (square.isCompleted) {
                                    setSelectedSquare(square);
                                    if (setIsModalOpen) setIsModalOpen(true);
                                } else {
                                    setSelectedStartSquare(square);
                                    if (setIsModalOpen) setIsModalOpen(true);
                                }
                            }}
                        >
                            {square.isCompleted ? (
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
                                    <span className={`material-symbols-outlined ${styles.emptyIcon}`}>help_outline</span>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>

            <p className={styles.footerHint}>
                <span className={`material-symbols-outlined ${styles.footerIcon}`}>favorite</span>
                Toca las casillas marcadas para recordar ese momento.
            </p>

            {/* Modal de Detalle (Polaroid) */}
            <AnimatePresence>
                {selectedSquare && (
                    <motion.div
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                            setSelectedSquare(null);
                            if (setIsModalOpen) setIsModalOpen(false);
                        }}
                    >
                        <motion.div
                            className={styles.polaroid}
                            initial={{ scale: 0.8, rotate: -5 }}
                            animate={{ scale: 1, rotate: 2 }}
                            exit={{ scale: 0.8, rotate: -5, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button className={styles.closeBtn} onClick={() => {
                                setSelectedSquare(null);
                                if (setIsModalOpen) setIsModalOpen(false);
                            }}>×</button>

                            <div className={styles.photoArea}>
                                {selectedSquare.memoryPhoto ? (
                                    <img src={selectedSquare.memoryPhoto} alt="Memoria" className={styles.memoryImg} />
                                ) : (
                                    <div className={styles.noPhotoDefault}>
                                        <span className={`material-symbols-outlined ${styles.bigFavoriteIcon}`}>
                                            {selectedSquare.emoji === 'favorite' ? 'favorite' : selectedSquare.emoji}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className={styles.polaroidText}>
                                <h2>{selectedSquare.title}</h2>
                                <p>{selectedSquare.description}</p>
                                <span className={styles.dateStamp}>
                                    {new Date(selectedSquare.completedAt).toLocaleDateString()}
                                </span>
                                {selectedSquare.photos && selectedSquare.photos.length > 0 && (
                                    <button
                                        className={styles.galleryBtn}
                                        onClick={() => setViewerPhotos(selectedSquare.photos)}
                                    >
                                        <span className="material-symbols-outlined">photo_library</span>
                                        Ver Galería ({selectedSquare.photos.length})
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedStartSquare && (
                    <BingoStartModal
                        bingoItem={selectedStartSquare}
                        defaultMinPhotos={globalSettings?.citaConfig?.minPhotosBingoDefault || 3}
                        onClose={() => {
                            setSelectedStartSquare(null);
                            if (setIsModalOpen) setIsModalOpen(false);
                        }}
                        onStartCita={(bingoData) => {
                            setSelectedStartSquare(null);
                            if (setIsModalOpen) setIsModalOpen(false);
                            if (setBingoContextToMap && setActiveTab) {
                                setBingoContextToMap(bingoData);
                                setActiveTab('lugares');
                            }
                        }}
                    />
                )}
            </AnimatePresence>

            <PhotoViewer
                photos={viewerPhotos}
                onClose={() => setViewerPhotos(null)}
            />

        </div>
    );
}
