import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
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
    const x = useMotionValue(0);

    // Colores tipo "Pastel Red" progresivos e intensos
    const backgroundColor = useTransform(
        x, 
        [-150, -60, 0], 
        ['#ff6b81', '#ffecf0', '#ffffff'] // De blanco a rosa claro y termina en un rojo pastel potente
    );
    const deleteOpacity = useTransform(x, [-80, -20, 0], [1, 0.4, 0]);
    const iconScale = useTransform(x, [-80, -30, 0], [1.3, 0.9, 0.4]);

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

    const maxDrag = containerWidth ? -(containerWidth * 0.9) : -300; 

    // Centrar automáticamente cuando se monta para asegurar estado limpio
    useEffect(() => {
        x.set(0);
    }, [x]);

    // Calcular ancho inicial y al redimensionar
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const handleDelete = () => {
        if (onRemove) {
            // Pequeña vibración visual antes de borrar
            animate(x, -containerWidth * 0.8, { duration: 0.3 });
            
            setTimeout(() => {
                onRemove(pd.id);
                toast.info('Recuerdo quitado de la lista ✨', 'Toca para DESHACER ↺', {
                    id: `delete-${pd.id}`, // Individual toast for each deletion
                    duration: 6000,
                    onClick: () => {
                        if (onRestore) {
                            onRestore(pd);
                            toast.success('¡Recuperado!', 'El recuerdo volvió a su lugar', { id: `delete-${pd.id}` });
                        }
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
            animate={{ 
                opacity: pd.isHidden ? 0 : 1, 
                y: 0,
                height: pd.isHidden ? 0 : 'auto',
                minHeight: pd.isHidden ? 0 : 'unset',
                marginBottom: pd.isHidden ? 0 : '1.125rem',
                scale: pd.isHidden ? 0.9 : 1
            }}
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
                animate={{ 
                    x: pd.isHidden ? -containerWidth : 0
                }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                onDragEnd={(e, info) => {
                    const currentX = x.get();
                    const threshold = containerWidth * 0.25 || 80; 
                    const isFlick = info.velocity.x < -500;
                    
                    if (currentX < -threshold || isFlick) {
                        handleDelete();
                    } else {
                        animate(x, 0, { type: 'spring', damping: 25, stiffness: 200 });
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
                    {pendingDates.filter(p => !p.isHidden).length === 0 ? (
                        <div className={styles.emptyState}>
                            <span className="material-symbols-outlined">celebration</span>
                            <p>¡Todo listo para hoy!</p>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {pendingDates.map((pd, idx) => (
                                <PendingDateCard
                                    key={pd.id}
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
