import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../../services/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';
import Carousel from '../Carousel/Carousel';
import styles from './MemoryViewer.module.css';
import { usePhotoCache } from '../../../hooks/usePhotoCache';
import { getMemoryFromCache } from '../../../utils/memoryPersistence';
import PhotoDetailOverlay from '../../../modules/gallery/components/PhotoDetailOverlay';

/**
 * MemoryViewer
 * Universal component to view a memory. Handles Offline/Online states seamlessly.
 * Ready to host the future "Shoebox 3D" view.
 */
export default function MemoryViewer({ memoryId, initialMemory, onClose }) {
    const { relationshipId } = useAuth();
    const [memory, setMemory] = useState(initialMemory || null);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);

    // Sync local state if initialMemory prop changes (Map navigation)
    useEffect(() => {
        if (initialMemory) {
            setMemory(initialMemory);
            setLoading(false);
        }
    }, [initialMemory]);

    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            if (!relationshipId) return;
            
            try {
                // 1. Try Cache First (Immediate for Offline Resilience)
                if (memoryId) {
                    const cached = await getMemoryFromCache(memoryId);
                    if (cached && isMounted && !memory) {
                        setMemory(cached);
                    }
                }

                // 2. Online: Hydrate/Verify with Firestore
                let localMem = memory;
                if (!localMem && memoryId && navigator.onLine) {
                    const memRef = doc(db, 'relationships', relationshipId, 'memories', memoryId);
                    const memSnap = await getDoc(memRef);
                    if (memSnap.exists()) {
                        localMem = { id: memSnap.id, ...memSnap.data() };
                        if (isMounted) setMemory(localMem);
                    }
                }

                // 3. Load Additional Photos (Subcollection)
                if (navigator.onLine && (localMem || memoryId)) {
                    const targetId = memoryId || localMem?.id;
                    const photosRef = collection(db, 'relationships', relationshipId, 'memories', targetId, 'photos');
                    const snap = await getDocs(photosRef);
                    
                    if (!snap.empty) {
                        const urls = snap.docs.map(d => d.data());
                        if (isMounted) setPhotos(urls);
                    } else if (localMem) {
                        // Fallback: Use main photo as the only item in "gallery"
                        if (isMounted) setPhotos([{ url: localMem.mainPhotoUrl, ...localMem }]);
                    }
                } else if (localMem || memory) {
                    // Offline fallback
                    const m = localMem || memory;
                    if (isMounted) setPhotos([{ url: m.mainPhotoUrl, ...m }]);
                }
            } catch (err) {
                console.error("Error loading MemoryViewer data:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadData();

        return () => { isMounted = false; };
    }, [memoryId, initialMemory, relationshipId, memory]);

    const handlePhotoClick = () => {
        if (!navigator.onLine) return; // No full gallery offline
        if (photos.length > 0) {
            setIsGalleryOpen(true);
        }
    };

    if (!memory && loading) {
        return (
            <div className={styles.overlay}>
                <div className={styles.loader}>Cargando...</div>
            </div>
        );
    }

    const { title = 'Recuerdo', description = '', placeName = 'Ubicación', eventDate } = memory || {};
    const mainPhoto = usePhotoCache(memoryId, memory?.mainPhotoUrl || photos[0]?.url);

    return (
        <AnimatePresence>
            <motion.div 
                className={styles.overlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div className={styles.shoeboxContainer}>
                    <button className={styles.closeButton} onClick={onClose}>
                        <span className="material-symbols-rounded">close</span>
                    </button>

                    <motion.div
                        className={styles.polaroid}
                        initial={{ scale: 0.8, rotate: -8, y: 50 }}
                        animate={{ scale: 1, rotate: 2, y: 0 }}
                        exit={{ scale: 0.5, rotate: -15, opacity: 0, y: 100 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.photoArea} onClick={handlePhotoClick}>
                            <img src={mainPhoto} alt="Memory" className={styles.memoryImg} />

                            {!navigator.onLine && (
                                <div className={styles.offlineBadge}>
                                    <span className="material-symbols-rounded">cloud_off</span>
                                </div>
                            )}
                            
                            {navigator.onLine && photos.length > 1 && (
                                <div className={styles.photoCountHint}>
                                    <span className="material-symbols-rounded">gallery_thumbnail</span>
                                    <span>{photos.length}</span>
                                </div>
                            )}
                        </div>

                        <div className={styles.polaroidText}>
                            <h2 className={styles.polaroidTitle}>{title}</h2>
                            <p className={styles.description}>{description}</p>
                            
                            <div className={styles.metadata}>
                                {placeName && (
                                    <span className={styles.place}>
                                        <span className="material-symbols-rounded">location_on</span>
                                        {placeName}
                                    </span>
                                )}
                                <span className={styles.dateBadge}>
                                    {eventDate ? new Date(eventDate).toLocaleDateString('es-ES', { 
                                        day: 'numeric', 
                                        month: 'long', 
                                        year: 'numeric' 
                                    }) : 'Sin fecha'}
                                </span>
                            </div>
                            
                            {navigator.onLine && photos.length > 0 && (
                                <button className={styles.galleryBtn} onClick={handlePhotoClick}>
                                    <span className="material-symbols-rounded">photo_library</span>
                                    Ver Galería {photos.length > 0 ? `(${photos.length})` : ''}
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Sub-component for Full Gallery */}
                <AnimatePresence>
                    {isGalleryOpen && (
                        <PhotoDetailOverlay 
                            photos={photos}
                            initialIndex={0}
                            onClose={() => setIsGalleryOpen(false)}
                        />
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
}
