import React, { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import styles from './PhotoViewer.module.css';

export default function PhotoViewer({ photos, onClose }) {
    const [viewerIndex, setViewerIndex] = useState(0);

    return (
        <AnimatePresence>
            {photos && photos.length > 0 && (
                <motion.div
                    className={styles.viewerOverlay}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                    <button className={styles.viewerClose} onClick={onClose}>
                        <span className="material-symbols-outlined">close</span>
                    </button>

                    <div className={styles.viewerContent}>
                        <motion.img
                            key={viewerIndex}
                            src={photos[viewerIndex]}
                            alt="Vista completa"
                            className={styles.viewerImage}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2 }}
                        />

                        <div className={styles.viewerControls}>
                            <button
                                className={styles.viewerBtn}
                                onClick={() => setViewerIndex(prev => prev > 0 ? prev - 1 : photos.length - 1)}
                            >
                                <span className="material-symbols-outlined">chevron_left</span>
                            </button>
                            <div className={styles.viewerCounter}>
                                {viewerIndex + 1} / {photos.length}
                            </div>
                            <button
                                className={styles.viewerBtn}
                                onClick={() => setViewerIndex(prev => prev < photos.length - 1 ? prev + 1 : 0)}
                            >
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                        </div>
                    </div>

                    {/* Mini Strip of Thumbnails */}
                    {photos.length > 1 && (
                        <div className={styles.thumbnailsStrip}>
                            {photos.map((url, idx) => (
                                <img
                                    key={idx}
                                    src={url}
                                    alt={`Miniatura ${idx + 1}`}
                                    className={`${styles.thumbnailItem} ${idx === viewerIndex ? styles.thumbnailItemActive : ''}`}
                                    onClick={() => setViewerIndex(idx)}
                                />
                            ))}
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
