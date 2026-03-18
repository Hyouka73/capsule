import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../UserBingo.module.css';

export default function BingoMemoryPolaroid({ selectedSquare, onClose, onShowGallery }) {
    if (!selectedSquare) return null;

    return (
        <AnimatePresence>
            <motion.div
                className={styles.modalOverlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className={styles.polaroid}
                    initial={{ scale: 0.8, rotate: -5 }}
                    animate={{ scale: 1, rotate: 2 }}
                    exit={{ scale: 0.8, rotate: -5, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button className={styles.closeBtn} onClick={onClose}>×</button>

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
                                onClick={() => onShowGallery(selectedSquare.photos)}
                            >
                                <span className="material-symbols-outlined">photo_library</span>
                                Ver Galería ({selectedSquare.photos.length})
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
