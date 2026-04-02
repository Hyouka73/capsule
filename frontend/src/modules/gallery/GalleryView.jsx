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

    const handlePhotoClick = async (photo, topLevelIndex) => {
        if (photo._type === 'memory') {
            await loadCitationPhotos(photo, topLevelIndex, 0);
        } else {
            setViewerSelection({ items: filteredPhotos, index: topLevelIndex, topLevelIndex });
        }
    };

    const loadCitationPhotos = async (photo, topLevelIndex, direction = 1) => {
        setLoadingMemoryId(photo.id);
        try {
            let photosArray = [];
            const photosRef = collection(db, 'relationships', relationshipId, 'memories', photo.id, 'photos');
            const snap = await getDocs(photosRef);
            
            if (!snap.empty) {
                photosArray = snap.docs.map(d => d.data());
            }

            if (photosArray.length === 0) {
                photosArray = [{ url: photo.url, storagePath: photo.storagePath }];
            }

            const items = photosArray.map(p => ({
                url: p.url || p.storagePath || photo.url,
                title: photo.title,
                description: photo.description,
                createdAt: photo.createdAt,
                placeName: photo.placeName,
                _type: 'memory'
            }));

            // If navigating BACK (-1), we jump to the LAST photo of the new citation
            // If navigating FORWARD (1) or clicking (0), we jump to the FIRST photo (0)
            const targetIndex = direction < 0 ? items.length - 1 : 0;

            setViewerSelection({ items, index: targetIndex, topLevelIndex });
        } catch (err) {
            console.error("Error fetching memory photos:", err);
            setViewerSelection({ 
                items: [{ url: photo.url, title: photo.title, description: photo.description, _type: 'memory' }], 
                index: 0,
                topLevelIndex
            });
        } finally {
            setLoadingMemoryId(null);
        }
    };

    const navigateCitation = async (direction) => {
        if (!viewerSelection) return;
        const newTopLevelIndex = viewerSelection.topLevelIndex + direction;
        
        if (newTopLevelIndex < 0 || newTopLevelIndex >= filteredPhotos.length) {
            return; // Boundary reached
        }

        const nextPhoto = filteredPhotos[newTopLevelIndex];
        
        if (filter === 'memory') {
            await loadCitationPhotos(nextPhoto, newTopLevelIndex, direction); 
        } else {
            // Snapshots are just a flat list, no fetch needed
            setViewerSelection(prev => ({
                ...prev,
                index: newTopLevelIndex,
                topLevelIndex: newTopLevelIndex
            }));
        }
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

    if (loading && photos.length === 0) return <LoadingScreen message="Cargando tu universo..." />;

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

                <div ref={observerTarget} className={styles.loaderTarget}>
                    {loading && hasMore && (
                        <div className={styles.miniLoader}>
                            <div className={styles.spinner} />
                        </div>
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
