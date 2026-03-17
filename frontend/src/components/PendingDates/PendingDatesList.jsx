import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { toast } from './../../components/ui/PastelToast/PastelToast';
import styles from './PendingDatesList.module.css';

/**
 * Individual Card component with relative gesture logic
 */
function PendingDateCard({ pd, idx, onSelectDate, onRemove, onRestore }) {
    const isUploading = pd.status === 'uploading';
    const isFailed = pd.status === 'failed';
    const containerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        if (containerRef.current) {
            setContainerWidth(containerRef.current.offsetWidth);
        }
    }, []);

    // Motion values
    const x = useMotionValue(0);
    
    // Smooth color transform (White -> Subtle Rose)
    // Higher contrast rose for the swipe effect
    const backgroundColor = useTransform(x, [-120, 0], ['#ffe0e5', '#ffffff']);
    const deleteOpacity = useTransform(x, [-100, -20, 0], [1, 0.4, 0]);
    const iconScale = useTransform(x, [-80, -20, 0], [1.1, 0.9, 0.7]);

    // Better date parsing & 24hr format conversion
    const parts = pd.originalDate?.split(', ') || [];
    const displayDate = parts.length >= 3 ? parts[1] : (pd.originalDate || 'Sin fecha');
    let displayTime = parts.length >= 3 ? parts[2] : '';

    // Convert "06:32 p" or "06:32 p.m." to "18:32"
    if (displayTime) {
        const timeMatch = displayTime.match(/(\d{1,2}):(\d{2})\s*([ap])/i);
        if (timeMatch) {
            let [_, hours, minutes, ampm] = timeMatch;
            hours = parseInt(hours, 10);
            if (ampm.toLowerCase().startsWith('p') && hours < 12) hours += 12;
            if (ampm.toLowerCase().startsWith('a') && hours === 12) hours = 0;
            displayTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
        } else {
            // Clean up if it doesn't match the regex but has suffix
            displayTime = displayTime.replace(/\s*[ap]\.?m?\.?/gi, '').trim();
        }
    }

    const maxDrag = containerWidth ? -(containerWidth * 0.45) : -150;

    const handleDelete = () => {
        if (onRemove) {
            toast.loading('Eliminando...', 'Quitando este recuerdo de la lista');
            setTimeout(() => {
                onRemove(pd.id);
                toast.info('Recuerdo eliminado', 'Toca aquí para deshacer ↺', {
                    duration: 6000,
                    onClick: () => {
                        if (onRestore) onRestore(pd);
                    }
                });
            }, 300);
        }
    };

    return (
        <motion.div
            ref={containerRef}
            layout
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ 
                x: 200, 
                opacity: 0, 
                scale: 0.9,
                transition: { duration: 0.4, ease: [0.32, 0, 0.67, 0] } 
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={styles.listItemContainer}
        >
            <motion.div 
                className={styles.deleteBackground}
                style={{ opacity: deleteOpacity }}
            >
                <motion.span 
                    className="material-symbols-outlined"
                    style={{ scale: iconScale }}
                >
                    delete
                </motion.span>
                <span className={styles.deleteLabel}>Eliminar</span>
            </motion.div>

            <motion.div
                style={{ x, background: backgroundColor }}
                drag={!isUploading ? "x" : false}
                dragConstraints={{ left: maxDrag, right: 0 }}
                dragElastic={0.15}
                dragMomentum={false}
                onDragEnd={(e, { offset }) => {
                    const threshold = containerWidth * 0.40 || 120;
                    if (offset.x < -threshold) {
                        handleDelete();
                    }
                }}
                className={`${styles.listItem} ${isUploading ? styles.listItemUploading : ''} ${isFailed ? styles.listItemFailed : ''}`}
            >
                <div 
                    className={styles.itemContent}
                    onClick={() => !isUploading && onSelectDate(pd)}
                >
                    <div className={styles.thumbWrapper}>
                        {pd.photos?.[0]?.objectUrl ? (
                            <img src={pd.photos[0].objectUrl} alt="Recuerdo" className={styles.thumb} />
                        ) : (
                            <div className={styles.thumbFallback}>
                                <span className="material-symbols-outlined">photo_camera</span>
                            </div>
                        )}
                        {isUploading && (
                            <div className={styles.statusOverlay}><div className={styles.miniSpinner}></div></div>
                        )}
                        {isFailed && (
                            <div className={`${styles.statusOverlay} ${styles.failedOverlay}`}>
                                <span className="material-symbols-outlined">error</span>
                            </div>
                        )}
                    </div>

                    <div className={styles.info}>
                        <span className={styles.date}>{displayDate}</span>
                        <div className={styles.detailsRow}>
                            <span className={styles.photoCount}>
                                <span className="material-symbols-outlined">photo_library</span>
                                {pd.photos?.length || 0} fotos
                            </span>
                            {displayTime && <span className={styles.timeTag}>{displayTime}</span>}
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function PendingDatesList({ pendingDates = [], onClose, onSelectDate, onRemove, onRestore }) {
    return (
        <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className={styles.glassCard} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h3>Citas sin guardar</h3>
                        <p>Ordena tus recuerdos ✨</p>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className={styles.scrollList}>
                    {pendingDates.length === 0 ? (
                        <div className={styles.emptyState}>
                            <span className="material-symbols-outlined">celebration</span>
                            <p>¡Todo listo para hoy!</p>
                        </div>
                    ) : (
                        <AnimatePresence mode='popLayout'>
                            {pendingDates.map((pd, idx) => (
                                <PendingDateCard
                                    key={pd.id || idx}
                                    pd={pd}
                                    idx={idx}
                                    onSelectDate={onSelectDate}
                                    onRemove={onRemove}
                                    onRestore={onRestore}
                                />
                            ))}
                        </AnimatePresence>
                    )}
                </div>
                
                <div className={styles.footerInfo}>
                    <span className="material-symbols-outlined">info</span>
                    Desliza a la izquierda para descartar
                </div>
            </div>
        </motion.div>
    );
}
