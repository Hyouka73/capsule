import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGallery } from './hooks/useGallery';
import PhotoDetailOverlay from './components/PhotoDetailOverlay';
import LoadingScreen from '../../components/ui/LoadingScreen/LoadingScreen';
import styles from './GalleryView.module.css';

/**
 * GalleryView — Chronological photogrid for all memories
 */
export default function GalleryView() {
    const { photos, loading, hasMore, loadMore, error } = useGallery(24);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
    const observerTarget = useRef(null);

    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    loadMore();
                }
            },
            { threshold: 1.0 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loading, loadMore]);

    if (loading && photos.length === 0) {
        return <LoadingScreen message="Cargando sus momentos... ✨" />;
    }

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <span className="material-symbols-outlined">error</span>
                <p>Ups, no pudimos cargar las fotos</p>
                <button onClick={() => window.location.reload()}>Reintentar</button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Nuestra Galería</h1>
                <p className={styles.subtitle}>Un recorrido por nuestros momentos</p>
            </header>

            {photos.length === 0 ? (
                <motion.div
                    className={styles.emptyState}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className={styles.emptyCard}>
                        <div className={styles.emptyIcon}>
                            <span className="material-symbols-outlined">auto_awesome_motion</span>
                            <div className={styles.sparkle}>✨</div>
                        </div>
                        <h2>Aquí vivirán sus recuerdos 🌸</h2>
                        <p>Cada foto que suban en sus citas aparecerá aquí para que siempre puedan volver a ella.</p>
                        <div className={styles.emptyDecoration}>
                            <div className={styles.dot} />
                            <div className={styles.dot} />
                            <div className={styles.dot} />
                        </div>
                    </div>
                </motion.div>
            ) : (
                <div className={styles.grid}>
                    {photos.map((photo, index) => (
                        <motion.div
                            key={photo.id}
                            className={styles.photoThumb}
                            onClick={() => setSelectedPhotoIndex(index)}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: (index % 12) * 0.05 }}
                        >
                            <img
                                src={photo.url || photo.storagePath}
                                alt={photo.caption || ''}
                                loading="lazy"
                            />
                            {photo.isSpecial && (
                                <div className={styles.specialBadge}>
                                    <span className="material-symbols-outlined">favorite</span>
                                </div>
                            )}
                            {photo._type === 'snapshot' && (
                                <div className={styles.snapshotBadge}>📸</div>
                            )}
                            {photo.wasUnseen && (
                                <div className={styles.unseenBadge}>📥</div>
                            )}
                        </motion.div>
                    ))}

                    {/* Intersection Observer Target */}
                    <div ref={observerTarget} className={styles.loaderTarget}>
                        {loading && (
                            <div className={styles.miniLoader}>
                                <div className={styles.spinner} />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Photo Detail Modal */}
            <AnimatePresence>
                {selectedPhotoIndex !== null && (
                    <PhotoDetailOverlay
                        photos={photos}
                        initialIndex={selectedPhotoIndex}
                        onClose={() => setSelectedPhotoIndex(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
