import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../hooks/useAuth';
import { useAppConfig } from '../../../hooks/useAppConfig';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import Carousel from '../../../components/ui/Carousel/Carousel';
import styles from './PhotoDetailOverlay.module.css';

/**
 * PhotoDetailOverlay — Full screen photo viewer using the project's standard Carousel
 */
export default function PhotoDetailOverlay({ 
    photos, 
    initialIndex, 
    onClose,
    onNavigateNext, 
    onNavigatePrev  
}) {
    const { user, relationshipId } = useAuth();
    const config = useAppConfig(); // Contains names and relationship info
    const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
    const [drawerState, setDrawerState] = useState('peek');
    const [isDownloading, setIsDownloading] = useState(false);
    const [displayPhotos, setDisplayPhotos] = useState(photos);
    const [isHydrating, setIsHydrating] = useState(false);

    // Handle photos change (when jumping between memories)
    useEffect(() => {
        setCurrentIndex(initialIndex);
        setDisplayPhotos(photos);
        
        const hydratePhotos = async () => {
            const currentPhotos = Array.isArray(photos) ? photos : [photos];
            const memory = currentPhotos[0];

            if (navigator.onLine && currentPhotos.length === 1 && memory?._type === 'memory' && memory.id) {
                setIsHydrating(true);
                try {
                    const photosRef = collection(db, 'relationships', relationshipId, 'memories', memory.id, 'photos');
                    const snap = await getDocs(photosRef);
                    if (!snap.empty) {
                        const urls = snap.docs.map(d => ({
                            ...d.data(),
                            title: memory.title,
                            description: memory.description,
                            eventDate: memory.eventDate,
                            placeName: memory.placeName
                        }));
                        setDisplayPhotos(urls);
                    }
                } catch (err) {
                    console.error("[PhotoDetailOverlay] Hydration failed:", err);
                } finally {
                    setIsHydrating(false);
                }
            }
        };

        hydratePhotos();
    }, [photos, initialIndex, relationshipId]);

    if (!displayPhotos || (Array.isArray(displayPhotos) && displayPhotos.length === 0)) return null;
    
    // Normalize photos array (sometimes it might be just one object from cache)
    const normalizedPhotos = Array.isArray(displayPhotos) ? displayPhotos : [displayPhotos];

    const currentPhoto = normalizedPhotos[currentIndex] || normalizedPhotos[0];
    const hasMetadata = currentPhoto.title || currentPhoto.description || currentPhoto.caption || currentPhoto.placeName || currentPhoto.createdAt || currentPhoto.eventDate;

    const renderPhotoItem = (photo) => (
        <div className={styles.slideContent}>
            <img
                src={photo.url || photo.storagePath}
                alt={photo.caption || ''}
                className={styles.mainPhoto}
                loading="eager"
            />
        </div>
    );

    const handleDownload = async () => {
        if (isDownloading) return;
        
        setIsDownloading(true);
        try {
            const url = currentPhoto.url || currentPhoto.storagePath;
            if (!url) throw new Error("No URL found for photo");

            // Fetch with CORS mode explicitly to allow binary download
            const response = await fetch(url, { mode: 'cors' });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = blobUrl;
            
            // Generate clean filename
            const dateStr = currentPhoto.createdAt ? new Date(currentPhoto.createdAt).toISOString().split('T')[0] : 'foto';
            const titleStr = (currentPhoto.title || 'capsule').replace(/\s+/g, '-').toLowerCase();
            const filename = `${dateStr}-${titleStr}.jpg`;
            
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
        } catch (err) {
            console.error("Error downloading photo:", err);
            
            let msg = "No se pudo descargar la foto. Intenta de nuevo.";
            if (err.message.includes('fetch') || err.name === 'TypeError') {
                msg = "Error de red o permisos (CORS).";
            }
            
            alert(msg);
        } finally {
            setIsDownloading(false);
        }
    };

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
                    
                    if (absY > 30 && absY > absX * 2) {
                        if (info.offset.y < 0) setDrawerState('open');
                        else setDrawerState('peek');
                    }
                }}
            >
                <Carousel 
                    key={`carousel-${currentPhoto.id || currentPhoto.memoryId || 'unified'}`} 
                    items={normalizedPhotos}
                    initialIndex={initialIndex}
                    onIndexChange={(idx) => {
                        setCurrentIndex(idx);
                    }}
                    onBack={onClose}
                    onAttemptNext={onNavigateNext}
                    onAttemptPrev={onNavigatePrev}
                    renderItem={renderPhotoItem}
                />
            </motion.div>

            {!navigator.onLine && (
                <div className={styles.offlineIndicator}>
                    <span className="material-symbols-rounded">cloud_off</span>
                    <span>Estas viendo una versión guardada</span>
                </div>
            )}

            {/* Optimized Metadata Drawer (Chunky Clay) */}
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
                    peek: { y: 'calc(100% - 88px)' },
                    open: { y: 0 }
                }}
                initial="peek"
                animate={hasMetadata ? drawerState : "peek"}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            >
                <div 
                    className={styles.drawerHandleWrap}
                    onClick={() => setDrawerState(prev => prev === 'peek' ? 'open' : 'peek')}
                    aria-label={drawerState === 'peek' ? 'Abrir detalles' : 'Cerrar detalles'}
                >
                    <div className={styles.drawerHandle} />
                </div>
                
                <div className={styles.scrollableContent}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentPhoto.url || currentPhoto.storagePath || 'metadata'} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className={styles.contentInner}
                        >
                            <div 
                                className={styles.primaryRow}
                                onClick={() => drawerState === 'peek' && setDrawerState('open')}
                            >
                                <div className={styles.titleInfo}>
                                    {currentPhoto._type === 'snapshot' && (
                                        <span className={styles.miniEmoji}>{currentPhoto.userEmoji || '📸'}</span>
                                    )}
                                    <h3 className={styles.photoTitle}>
                                        {currentPhoto.title || (currentPhoto._type === 'snapshot' ? 'Instantánea' : 'Memoria')}
                                    </h3>
                                </div>
                                {currentPhoto.createdAt || currentPhoto.eventDate ? (
                                    <span className={styles.miniDate}>
                                        {new Date(currentPhoto.createdAt || currentPhoto.eventDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                        {drawerState === 'open' && ` ${new Date(currentPhoto.createdAt || currentPhoto.eventDate).getFullYear()}`}
                                    </span>
                                ) : null}
                            </div>

                            <div className={`${styles.expandedArea} ${drawerState === 'open' ? styles.isVisible : ''}`}>
                                {(currentPhoto.caption || currentPhoto.message || currentPhoto.comment) && (
                                    <p className={styles.caption}>
                                        {currentPhoto.caption || currentPhoto.message || currentPhoto.comment}
                                    </p>
                                )}

                                {currentPhoto.description && currentPhoto.description !== currentPhoto.title && (
                                    <p className={styles.description}>{currentPhoto.description}</p>
                                )}

                                <div className={styles.metaGrid}>
                                    {currentPhoto._type === 'snapshot' && (
                                        <div className={styles.metaItem}>
                                            <span className="material-symbols-rounded">person</span>
                                            <span>
                                                {!currentPhoto.createdBy
                                                    ? 'Instantánea'
                                                    : (currentPhoto.createdBy === user?.uid 
                                                        ? 'Tú' 
                                                        : (currentPhoto.createdBy === config.adminUid 
                                                            ? config.names?.admin || 'Admin'
                                                            : (currentPhoto.createdBy === config.partnerUid 
                                                                ? config.names?.partner || 'Pareja'
                                                                : 'Instantánea')))
                                                }
                                            </span>
                                        </div>
                                    )}
                                    
                                    {(currentPhoto.placeName || currentPhoto.location) && (
                                        <div className={styles.metaItem}>
                                            <span className="material-symbols-rounded">location_on</span>
                                            <span className={styles.truncate}>{currentPhoto.placeName || currentPhoto.location?.name || 'Ubicación'}</span>
                                        </div>
                                    )}

                                    <div 
                                        className={`${styles.metaItem} ${styles.actionButton} ${isDownloading ? styles.loading : ''}`} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownload();
                                        }}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        {isDownloading ? (
                                            <>
                                                <div className={styles.spinner} />
                                                <span>Descargando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-rounded">download</span>
                                                <span>Guardar</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
}
