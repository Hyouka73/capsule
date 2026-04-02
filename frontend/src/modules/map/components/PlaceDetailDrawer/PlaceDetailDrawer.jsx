import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { useAuth } from '../../../../hooks/useAuth';
import styles from './PlaceDetailDrawer.module.css';
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
    const { relationshipId } = useAuth();
    const [loadingMemoryId, setLoadingMemoryId] = useState(null);

    const handleMemoryClick = async (memory, topLevelIndex, targetInitialIndex = 0) => {
        if (!onPhotoClick) return;
        setLoadingMemoryId(memory.id);

        try {
            let photosArray = [];
            const photosRef = collection(db, 'relationships', relationshipId, 'memories', memory.id, 'photos');
            const snap = await getDocs(photosRef);

            if (!snap.empty) {
                photosArray = snap.docs.map(d => d.data());
            }

            if (photosArray.length === 0) {
                photosArray = [{ url: memory.mainPhotoUrl }];
            }

            const items = photosArray.map(p => ({
                url: p.url || p.storagePath || memory.mainPhotoUrl,
                title: memory.title,
                description: memory.description,
                createdAt: memory.eventDate,
                placeName: selectedPlace.name,
                _type: 'memory'
            }));

            // Sync with parent (UserDashboard) providing context for jumps
            onPhotoClick({ 
                items, 
                index: targetInitialIndex, 
                topLevelIndex,
                contextList: placeMemories // Pass the siblings for navigation
            });
        } catch (e) {
            console.error('Error fetching memory photos:', e);
            onPhotoClick({ 
                items: [{ 
                    url: memory.mainPhotoUrl, 
                    title: memory.title, 
                    description: memory.description, 
                    createdAt: memory.eventDate, 
                    placeName: selectedPlace.name, 
                    _type: 'memory' 
                }], 
                index: 0,
                topLevelIndex,
                contextList: placeMemories
            });
        } finally {
            setLoadingMemoryId(null);
        }
    };

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

                {/* CITA CHECKER ACTION */}
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
                            <motion.div 
                                key={`list-${selectedPlace.id}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className={styles.memoriesScroll}
                            >
                                <h3 className={styles.sectionTitle}>Bitácora de Memorias 📔</h3>
                                {placeMemories.length > 0 ? (
                                    placeMemories.map((memory, index) => (
                                        <div
                                            key={memory.id}
                                            className={styles.memoryCard}
                                            onClick={() => handleMemoryClick(memory, index)}
                                        >
                                            <div className={styles.memoryPhotoWrap}>
                                                <MemoryPhoto 
                                                    placeId={selectedPlace.id} 
                                                    originalUrl={memory.mainPhotoUrl} 
                                                    className={styles.memoryPhoto} 
                                                />
                                                {loadingMemoryId === memory.id && (
                                                    <div className={styles.loadingOverlay}>
                                                        <div className={styles.spinnerWrapper}></div>
                                                    </div>
                                                )}
                                                {memory.photoCount > 1 && (
                                                    <div className={styles.photoCountBadge}>
                                                        {memory.photoCount} {memory.photoCount === 1 ? 'foto' : 'fotos'}
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
                        </AnimatePresence>
                    </div>
                )}
            </div>
            
            {/* Hidden navigation helper for UserDashboard */}
            {selectedPlace && (
                <div id="place-nav-helper" style={{ display: 'none' }} 
                     data-memories={JSON.stringify(placeMemories)} 
                     data-callback={handleMemoryClick.toString()} />
            )}
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
