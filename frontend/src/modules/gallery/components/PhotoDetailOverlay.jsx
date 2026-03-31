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
    const hasMetadata = currentPhoto.title || currentPhoto.description || currentPhoto.caption || currentPhoto.placeName || currentPhoto.createdAt || currentPhoto.placeName || currentPhoto.location;

    const renderPhotoItem = (photo) => (
        <div className={styles.slideContent}>
            <img
                src={photo.url || photo.storagePath}
                alt={photo.caption || ''}
                className={styles.mainPhoto}
            />
        </div>
    );

    return (
        <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div 
                className={styles.carouselWrapper}
                onPanEnd={(e, info) => {
                    const absX = Math.abs(info.offset.x);
                    const absY = Math.abs(info.offset.y);
                    
                    // If it's more vertical than horizontal (strict ratio 2:1)
                    if (absY > 30 && absY > absX * 2) {
                        if (info.offset.y < 0) setDrawerState('open');
                        else setDrawerState('peek');
                    }
                }}
            >
                <Carousel 
                    items={photos}
                    initialIndex={initialIndex}
                    onIndexChange={(idx) => {
                        setCurrentIndex(idx);
                    }}
                    onBack={onClose}
                    renderItem={renderPhotoItem}
                />
            </motion.div>

            {/* Drawer UI - NO key or AnimatePresence here to avoid unmounting flicker */}
            <motion.div
                className={styles.metadata}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.05}
                onDragEnd={(e, { offset, velocity }) => {
                    if (offset.y < -30 || velocity.y < -300) {
                        setDrawerState('open');
                    } else if (offset.y > 30 || velocity.y > 300) {
                        setDrawerState('peek');
                    }
                }}
                variants={{
                    peek: { y: 'calc(100% - 35px)' },
                    open: { y: 0 }
                }}
                initial="peek"
                animate={hasMetadata ? drawerState : "peek"} /* Hide content but keep drawer structure if no metadata? Actually hasMetadata handles text. */
                style={{ display: hasMetadata ? 'flex' : 'none' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            >
                <div 
                    className={styles.drawerHandleWrap}
                    onClick={() => setDrawerState(prev => prev === 'peek' ? 'open' : 'peek')}
                >
                    <div className={styles.drawerHandle} />
                </div>
                
                <div className={styles.scrollableContent}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className={styles.contentInner}
                        >
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
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
}
