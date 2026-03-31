import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Carousel from '../../../components/ui/Carousel/Carousel';
import styles from './PhotoDetailOverlay.module.css';

/**
 * PhotoDetailOverlay — Full screen photo viewer using the project's standard Carousel
 */
export default function PhotoDetailOverlay({ photos, initialIndex, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
    const [drawerState, setDrawerState] = useState('peek');

    if (!photos || photos.length === 0) return null;

    const currentPhoto = photos[currentIndex] || photos[0];
    const hasMetadata = currentPhoto.title || currentPhoto.description || currentPhoto.caption || currentPhoto.placeName;

    const renderPhotoItem = (photo) => (
        <div className={styles.slideContent}>
            <img
                src={photo.url || photo.storagePath}
                alt={photo.caption || ''}
                className={styles.mainPhoto}
            />
        </div>
    );

    const [touchStartY, setTouchStartY] = useState(null);

    const handleTouchStart = (e) => {
        setTouchStartY(e.touches[0].clientY);
    };

    const handleTouchEnd = (e) => {
        if (!touchStartY) return;
        const touchEndY = e.changedTouches[0].clientY;
        const diff = touchStartY - touchEndY;

        // diff > 0 means swiped UP
        // diff < 0 means swiped DOWN
        if (diff > 50) {
            setDrawerState('open');
        } else if (diff < -50) {
            setDrawerState('peek');
        }
        
        setTouchStartY(null);
    };

    return (
        <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <Carousel 
                items={photos}
                initialIndex={initialIndex}
                onIndexChange={(idx) => {
                    setCurrentIndex(idx);
                    setDrawerState('peek'); // Reset on photo change
                }}
                onBack={onClose}
                renderItem={renderPhotoItem}
            />

            {/* Invisible Gesture Area at Bottom (Intercepts touches without blocking Carousel's x-drag) */}
            <div 
                className={styles.gestureCapture}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            />

            {/* Toggle Handle / Peek UI explicitly rendering even when hidden, to prompt the user */}
            <AnimatePresence mode="wait">
                {hasMetadata && (
                    <motion.div
                        key={`drawer-${currentIndex}`}
                        className={styles.metadata}
                        variants={{
                            peek: { y: 'calc(100% - 35px)' },
                            open: { y: 0 }
                        }}
                        initial="peek"
                        animate={drawerState}
                        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                        onClick={() => setDrawerState(prev => prev === 'peek' ? 'open' : 'peek')}
                    >
                        <div className={styles.drawerHandleWrap}>
                            <div className={styles.drawerHandle} />
                        </div>
                        
                        {currentPhoto.caption && <p className={styles.caption}>{currentPhoto.caption}</p>}
                        {currentPhoto.title && <h3 className={styles.photoTitle}>{currentPhoto.title}</h3>}
                        {currentPhoto.description && <p className={styles.description}>{currentPhoto.description}</p>}

                        <div className={styles.infoRow}>
                            {currentPhoto.createdAt && (
                                <div className={styles.infoItem}>
                                    <span className="material-symbols-rounded">calendar_month</span>
                                    <span>{new Date(currentPhoto.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                            )}
                            {(currentPhoto.placeName || currentPhoto.location) && (
                                <div className={styles.infoItem}>
                                    <span className="material-symbols-rounded">location_on</span>
                                    <span>{currentPhoto.placeName || currentPhoto.location?.name || 'Ubicación'}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
