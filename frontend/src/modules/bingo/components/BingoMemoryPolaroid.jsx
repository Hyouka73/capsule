import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import styles from '../UserBingo.module.css';

export default function BingoMemoryPolaroid({ selectedSquare, onClose, onShowGallery }) {
    const [memory, setMemory] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!selectedSquare?.completedMemoryId) {
            setMemory(null);
            setPhotos([]);
            return;
        }

        const fetchMemoryDetails = async () => {
            setLoading(true);
            try {
                const memoryId = selectedSquare.completedMemoryId;
                const memoryDoc = await getDoc(doc(db, 'memories', memoryId));
                
                if (memoryDoc.exists()) {
                    const data = memoryDoc.data();
                    setMemory(data);

                    // Fetch subcollection photos
                    const photosSnap = await getDocs(collection(db, 'memories', memoryId, 'photos'));
                    const photosList = photosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                    setPhotos(photosList);
                }
            } catch (err) {
                console.error('[BingoMemoryPolaroid] Error fetching memory:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMemoryDetails();
    }, [selectedSquare?.completedMemoryId]);

    // Use memory values if available, otherwise fallback to square metadata
    const displayTitle = memory?.title || selectedSquare?.title || 'Recuerdo';
    const displayDescription = memory?.description || selectedSquare?.description || '';
    const mainPhoto = memory?.mainPhotoUrl || selectedSquare?.memoryPhoto;
    const galleryPhotos = photos.length > 0 ? photos : (mainPhoto ? [{ url: mainPhoto }] : []);

    return (
        <AnimatePresence>
            {selectedSquare && (
                <motion.div
                    className={styles.modalOverlay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    key="polaroid-overlay"
                >
                    <motion.div
                        className={styles.polaroid}
                        initial={{ scale: 0.8, rotate: -8, y: 50 }}
                        animate={{ scale: 1, rotate: 2, y: 0 }}
                        exit={{ scale: 0.5, rotate: -15, opacity: 0, y: 100 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className={styles.closeBtn} onClick={onClose}>
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <div className={styles.photoArea}>
                            {loading ? (
                                <div className={styles.loader}>✨</div>
                            ) : mainPhoto ? (
                                <img src={mainPhoto} alt={displayTitle} className={styles.memoryImg} />
                            ) : (
                                <div className={styles.noPhotoDefault}>
                                    <span className={`material-symbols-outlined ${styles.emoji}`}>
                                        {selectedSquare.emoji || 'favorite'}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className={styles.polaroidText}>
                            <h2 className={styles.title}>{displayTitle}</h2>
                            <p className={styles.description}>{displayDescription}</p>
                            
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                                <span className={styles.dateBadge}>
                                    {selectedSquare.completedAt ? new Date(selectedSquare.completedAt).toLocaleDateString('es-ES', { 
                                        day: 'numeric', 
                                        month: 'long', 
                                        year: 'numeric' 
                                    }) : 'Sin fecha'}
                                </span>
                            </div>

                            {!loading && galleryPhotos.length > 0 && (
                                <button
                                    className={styles.galleryBtn}
                                    onClick={() => onShowGallery(galleryPhotos)}
                                >
                                    <span className="material-symbols-outlined">photo_library</span>
                                    Ver Galería ({galleryPhotos.length})
                                </button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
