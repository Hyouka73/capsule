import { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGallery } from './hooks/useGallery';
import PhotoDetailOverlay from './components/PhotoDetailOverlay';
import LoadingScreen from '../../components/ui/LoadingScreen/LoadingScreen';
import styles from './GalleryView.module.css';

/**
 * GalleryView — Optimized for Photos (Minimal UI)
 */
export default function GalleryView({ onOverlayStateChange }) {
    const { photos, loading, hasMore, loadMore, error } = useGallery(24);
    const [filter, setFilter] = useState('all'); // all, memory, snapshot
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
    const observerTarget = useRef(null);

    // Filter and process photos
    const filteredPhotos = useMemo(() => {
        if (filter === 'all') return photos;
        return photos.filter(p => p._type === filter);
    }, [photos, filter]);

    // Handle overlay state for Navbar hiding
    useEffect(() => {
        if (onOverlayStateChange) {
            onOverlayStateChange(selectedPhotoIndex !== null);
        }
        // Cleanup when unmounting the gallery tab
        return () => {
            if (onOverlayStateChange) onOverlayStateChange(false);
        };
    }, [selectedPhotoIndex, onOverlayStateChange]);

    // Infinite Scroll Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    loadMore();
                }
            },
            { threshold: 0.1, rootMargin: '200px' }
        );

        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [hasMore, loading, loadMore]);

    if (loading && photos.length === 0) return <LoadingScreen message="Cargando tu universo..." />;

    return (
        <div className={styles.container}>
            {/* Minimal Filter Bar */}
            <div className={styles.filterSection}>
                <div className={styles.filterWrapper}>
                    <button 
                        className={`${styles.filterBtn} ${filter === 'all' ? styles.filterBtnActive : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        Todo
                    </button>
                    <button 
                        className={`${styles.filterBtn} ${filter === 'memory' ? styles.filterBtnActive : ''}`}
                        onClick={() => setFilter('memory')}
                    >
                        Recuerdos
                    </button>
                    <button 
                        className={`${styles.filterBtn} ${filter === 'snapshot' ? styles.filterBtnActive : ''}`}
                        onClick={() => setFilter('snapshot')}
                    >
                        Instantes
                    </button>
                </div>
            </div>

            <main className={styles.galleryWrapper}>
                {filteredPhotos.length > 0 ? (
                    <motion.div 
                        className={styles.masonryGrid}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {filteredPhotos.map((photo, index) => (
                            <motion.div
                                key={photo.id || index}
                                className={styles.photoCard}
                                layout
                                onClick={() => setSelectedPhotoIndex(index)}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className={styles.imageContainer}>
                                    <img src={photo.thumbnail || photo.url} alt="Recuerdo" loading="lazy" />
                                    {photo.isNew && <div className={styles.newTag}>Nuevo</div>}
                                    {photo._type === 'snapshot' && (
                                        <div className={styles.specialBadge}>
                                            <span className="material-symbols-rounded">photo_camera</span>
                                        </div>
                                    )}
                                    {photo.isSpecial && (
                                        <div className={styles.specialIndicator}>
                                            <span className="material-symbols-rounded">star</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyCard}>
                            <div className={styles.emptyIcon}>
                                <span className="material-symbols-rounded">photo_library</span>
                                <div className={styles.sparkle}>✨</div>
                            </div>
                            <h3>Aún no hay fotos aquí</h3>
                            <p>¡Capturen nuevos momentos juntos para llenar su galería!</p>
                        </div>
                    </div>
                )}

                {/* Observer Target for load more */}
                <div ref={observerTarget} className={styles.loaderTarget}>
                    {loading && hasMore && (
                        <div className={styles.miniLoader}>
                            <div className={styles.spinner} />
                        </div>
                    )}
                </div>
            </main>

            {/* Photo Detail Viewer */}
            <AnimatePresence>
                {selectedPhotoIndex !== null && (
                    <PhotoDetailOverlay
                        photos={filteredPhotos}
                        initialIndex={selectedPhotoIndex}
                        onClose={() => setSelectedPhotoIndex(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
