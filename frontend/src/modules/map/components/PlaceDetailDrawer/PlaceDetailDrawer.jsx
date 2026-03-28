import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './PlaceDetailDrawer.module.css';
import Carousel from '../../../../components/ui/Carousel/Carousel';
import { useCacheThumbnail } from '../../../../hooks/useCacheThumbnail';

/**
 * PlaceDetailDrawer
 * 
 * Component extracted from MapView to handle place details, memories, 
 * and the "Cita Checker" verification flow.
 */
export default function PlaceDetailDrawer({
    selectedPlace,
    onClose,
    loadingMemories,
    placeMemories,
    onPhotoClick,
    citaContext,
    onVerifyPlace
}) {
    const [view, setView] = useState('list'); // 'list' or 'photos'
    const [selectedPhotos, setSelectedPhotos] = useState([]);

    // Reset view when place changes
    useEffect(() => {
        setView('list');
        setSelectedPhotos([]);
    }, [selectedPlace?.id]);

    if (!selectedPlace) return null;

    return (
        <div className={`${styles.drawer} ${selectedPlace ? styles.drawerOpen : ''}`}>
            <div className={styles.drawerContent}>
                <div className={styles.drawerHandle} />
                
                <div className={styles.placeRow}>
                    <div className={styles.placeTitleGroup}>
                        <div className={styles.placeTitleWrapper}>
                            <span className={styles.placeEmoji}>{selectedPlace.emoji}</span>
                            <h2 className={styles.placeName}>{selectedPlace.name}</h2>
                        </div>
                        <div className={styles.tagsDisplay}>
                            {selectedPlace.tags?.map(t => (
                                <span key={t} className={styles.tag}>{t}</span>
                            ))}
                        </div>
                    </div>
                    <button className={styles.closeDrawer} onClick={onClose}>
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>

                {/* CITA CHECKER ACTION - Solo aparece cuando estamos en modo cita */}
                {citaContext && (
                    <div className={styles.verificationSection}>
                        <button 
                            className={styles.verifyBtn}
                            onClick={() => onVerifyPlace(selectedPlace)}
                        >
                            <span className="material-symbols-rounded">task_alt</span>
                            Confirmar que estoy aquí ✨
                        </button>
                    </div>
                )}

                {loadingMemories ? (
                    <div className={styles.drawerLoading}>
                        <div className={styles.miniSpinner} />
                        <span>Buscando memorias... ✨</span>
                    </div>
                ) : (
                    <div className={styles.contentBody}>
                        <AnimatePresence mode="wait">
                            {view === 'list' ? (
                                <motion.div 
                                    key="list"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className={styles.memoriesScroll}
                                >
                                    <h3 className={styles.sectionTitle}>Bitácora de Memorias 📔</h3>
                                    {placeMemories.length > 0 ? (
                                        placeMemories.map(memory => (
                                            <div
                                                key={memory.id}
                                                className={styles.memoryCard}
                                                onClick={() => {
                                                    const photoUrls = (memory.photos && memory.photos.length > 0) 
                                                        ? memory.photos 
                                                        : (memory.mainPhotoUrl ? [memory.mainPhotoUrl] : []);
                                                    
                                                    if (photoUrls.length > 0) {
                                                        setSelectedPhotos(photoUrls);
                                                        setView('photos');
                                                    }
                                                }}
                                            >
                                                <div className={styles.memoryPhotoWrap}>
                                                    <MemoryPhoto 
                                                        placeId={selectedPlace.id} 
                                                        originalUrl={memory.mainPhotoUrl} 
                                                        className={styles.memoryPhoto} 
                                                    />
                                                    {memory.photoCount > 1 && (
                                                        <div className={styles.photoCountBadge}>
                                                            {memory.photoCount} fotos
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={styles.memoryInfo}>
                                                    <div className={styles.memoryHeader}>
                                                        <h3 className={styles.memoryTitle}>{memory.title || 'Sin título'}</h3>
                                                        <span className={styles.memoryDate}>
                                                            {memory.eventDate ? new Date(memory.eventDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : ''}
                                                        </span>
                                                    </div>
                                                    <p className={styles.memoryDesc}>{memory.description}</p>
                                                    {memory.tags?.length > 0 && (
                                                        <div className={styles.memoryTags}>
                                                            {memory.tags.slice(0, 2).map(t => (
                                                                <span key={t} className={styles.miniTag}>#{t}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className={styles.noMemories}>
                                            <p>Aún no hay citas registradas aquí. 📸</p>
                                        </div>
                                    )}
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* FULL SCREEN PHOTO VIEWER */}
            <AnimatePresence>
                {view === 'photos' && (
                    <motion.div 
                        className={styles.fullScreenOverlay}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    >
                        <Carousel 
                            items={selectedPhotos} 
                            onBack={() => setView('list')} 
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function MemoryPhoto({ placeId, originalUrl, className }) {
    const displayUrl = useCacheThumbnail(placeId, originalUrl);

    if (!originalUrl) {
        return <div className="memory-photo-placeholder">📸</div>;
    }

    return (
        <img 
            src={displayUrl} 
            className={className} 
            alt="Memoria" 
            loading="lazy" 
        />
    );
}
