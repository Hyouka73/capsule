import { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useGallery } from './hooks/useGallery';
import PhotoDetailOverlay from './components/PhotoDetailOverlay';
import LoadingScreen from '../../components/ui/LoadingScreen/LoadingScreen';
import styles from './GalleryView.module.css';

/**
 * GalleryView — Optimized for Photos (Minimal UI)
 */
export default function GalleryView({ onOverlayStateChange }) {
    const { relationshipId } = useAuth();
    const { photos, loading, hasMore, loadMore, error } = useGallery(24);
    const [filter, setFilter] = useState('memory'); 
    const [viewerSelection, setViewerSelection] = useState(null);
    const [loadingMemoryId, setLoadingMemoryId] = useState(null);
    const observerTarget = useRef(null);

    // Filter and process photos
    const filteredPhotos = useMemo(() => {
        return photos.filter(p => p._type === filter);
    }, [photos, filter]);

    const handlePhotoClick = (photo, topLevelIndex) => {
        if (photo._type === 'memory') {
            // New Unified Flow: Go straight to full detail overlay
            setViewerSelection({ 
                items: [photo], 
                index: 0, 
                topLevelIndex,
                loadFullMemory: true 
            });
        } else {
            setViewerSelection({ items: filteredPhotos, index: topLevelIndex, topLevelIndex });
        }
    };

    const navigateCitation = (direction) => {
        if (!viewerSelection) return;
        const newTopLevelIndex = viewerSelection.topLevelIndex + direction;
        
        if (newTopLevelIndex < 0 || newTopLevelIndex >= filteredPhotos.length) {
            return; // Boundary reached
        }

        const nextPhoto = filteredPhotos[newTopLevelIndex];
        handlePhotoClick(nextPhoto, newTopLevelIndex);
    };

    // Handle overlay state for Navbar hiding
    useEffect(() => {
        if (onOverlayStateChange) {
            onOverlayStateChange(viewerSelection !== null);
        }
        return () => {
            if (onOverlayStateChange) onOverlayStateChange(false);
        };
    }, [viewerSelection, onOverlayStateChange]);

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

    const isEmpty = !loading && filteredPhotos.length === 0;

    return (
        <div className={styles.container}>
            <div className={styles.filterSection}>
                <div className={styles.filterWrapper}>
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
                <AnimatePresence mode="wait">
                    {loading && filteredPhotos.length === 0 ? (
                        <motion.div 
                            key="loading"
                            className={styles.initialLoadingContainer}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className={styles.loadingCenter}>
                                <div className={styles.spinnerLarge}></div>
                                <p>Buscando tus momentos...</p>
                            </div>
                        </motion.div>
                    ) : filteredPhotos.length > 0 ? (
                        <motion.div 
                            key="grid"
                            className={styles.masonryGrid}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {filteredPhotos.map((photo, index) => (
                                <motion.div
                                    key={photo.id || index}
                                    className={styles.photoCard}
                                    layout
                                    onClick={() => handlePhotoClick(photo, index)}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className={styles.imageContainer}>
                                        <img src={photo.thumbnail || photo.url} alt="Recuerdo" loading="lazy" />
                                        {loadingMemoryId === photo.id && (
                                            <div className={styles.loadingOverlay}>
                                                <div className={styles.spinnerWrapper}></div>
                                            </div>
                                        )}
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
                        <motion.div 
                            key="empty"
                            className={styles.emptyState}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4 }}
                        >
                            <div className={styles.emptyCard}>
                                <div className={styles.emptyIcon}>
                                    <span className="material-symbols-rounded">auto_awesome_motion</span>
                                    <div className={styles.sparkle}>✨</div>
                                </div>
                                {photos.length > 0 ? (
                                    <>
                                        <h3>No hay {filter === 'memory' ? 'recuerdos' : 'instantes'} aquí</h3>
                                        <p>Prueba a cambiar el filtro para ver tus otras fotos.</p>
                                    </>
                                ) : (
                                    <>
                                        <h3>Su historia comienza aquí</h3>
                                        <p>Aún no hay fotos en su galería. ¡Empiecen a capturar momentos mágicos!</p>
                                    </>
                                )}
                                <div className={styles.emptyAction}>
                                    <span className="material-symbols-rounded">add_a_photo</span>
                                    <span>Suban su primera foto desde una memoria</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div ref={observerTarget} className={styles.loaderTarget}>
                    {loading && hasMore && photos.length > 0 && (
                        <div className={styles.spinnerSmall} />
                    )}
                </div>
            </main>

            <AnimatePresence>
                {viewerSelection && (
                    <PhotoDetailOverlay
                        photos={viewerSelection.items}
                        initialIndex={viewerSelection.index}
                        onClose={() => setViewerSelection(null)}
                        onNavigateNext={() => navigateCitation(1)}
                        onNavigatePrev={() => navigateCitation(-1)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
