import { motion } from 'framer-motion';
import Carousel from '../../../components/ui/Carousel/Carousel';
import styles from './PhotoDetailOverlay.module.css';

/**
 * PhotoDetailOverlay — Full screen photo viewer using the project's standard Carousel
 */
export default function PhotoDetailOverlay({ photos, initialIndex, onClose }) {
    if (!photos || photos.length === 0) return null;

    const renderPhotoItem = (photo) => (
        <div className={styles.slideContent}>
            <img
                src={photo.url || photo.storagePath}
                alt={photo.caption || ''}
                className={styles.mainPhoto}
            />

            <div className={styles.metadata}>
                {photo.caption && <p className={styles.caption}>{photo.caption}</p>}
                {photo.title && <h3 className={styles.photoTitle}>{photo.title}</h3>}
                {photo.description && <p className={styles.description}>{photo.description}</p>}

                <div className={styles.infoRow}>
                    {photo.createdAt && (
                        <div className={styles.infoItem}>
                            <span className="material-symbols-rounded">calendar_month</span>
                            <span>{new Date(photo.createdAt).toLocaleDateString()}</span>
                        </div>
                    )}
                    {(photo.placeName || photo.location) && (
                        <div className={styles.infoItem}>
                            <span className="material-symbols-rounded">location_on</span>
                            <span>{photo.placeName || photo.location?.name || 'Ubicación'}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

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
                onBack={onClose}
                renderItem={renderPhotoItem}
            />
        </motion.div>
    );
}
