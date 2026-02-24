import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './PhotoDetailOverlay.module.css';

/**
 * PhotoDetailOverlay — Full screen photo viewer with metadata and swipe support
 */
export default function PhotoDetailOverlay({ photos, initialIndex, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    const currentPhoto = photos[currentIndex];

    const handleNext = () => {
        if (currentIndex < photos.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    // Swipe logic with framer-motion
    const swipeConfidenceThreshold = 10000;
    const swipePower = (offset, velocity) => {
        return Math.abs(offset) * velocity;
    };

    return (
        <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <button className={styles.closeBtn} onClick={onClose}>
                <span className="material-symbols-outlined">close</span>
            </button>

            <div className={styles.content}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPhoto.id}
                        className={styles.slide}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={1}
                        onDragEnd={(e, { offset, velocity }) => {
                            const swipe = swipePower(offset.x, velocity.x);

                            if (swipe < -swipeConfidenceThreshold) {
                                handleNext();
                            } else if (swipe > swipeConfidenceThreshold) {
                                handlePrev();
                            }
                        }}
                    >
                        <img
                            src={currentPhoto.url || currentPhoto.storagePath}
                            alt={currentPhoto.caption || ''}
                            className={styles.mainPhoto}
                        />

                        <div className={styles.metadata}>
                            {currentPhoto.caption && <p className={styles.caption}>{currentPhoto.caption}</p>}

                            <div className={styles.infoRow}>
                                {currentPhoto.createdAt && (
                                    <div className={styles.infoItem}>
                                        <span className="material-symbols-outlined">calendar_month</span>
                                        <span>{currentPhoto.createdAt.toDate?.().toLocaleDateString() || new Date(currentPhoto.createdAt).toLocaleDateString()}</span>
                                    </div>
                                )}
                                {currentPhoto.location && (
                                    <div className={styles.infoItem}>
                                        <span className="material-symbols-outlined">location_on</span>
                                        <span>{currentPhoto.location.name || 'Ubicación'}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Navigation Arrows (for desktop/accessibility) */}
                {currentIndex > 0 && (
                    <button className={`${styles.navBtn} ${styles.prevBtn}`} onClick={handlePrev}>
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                )}
                {currentIndex < photos.length - 1 && (
                    <button className={`${styles.navBtn} ${styles.nextBtn}`} onClick={handleNext}>
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                )}
            </div>

            <div className={styles.counter}>
                {currentIndex + 1} / {photos.length}
            </div>
        </motion.div>
    );
}
