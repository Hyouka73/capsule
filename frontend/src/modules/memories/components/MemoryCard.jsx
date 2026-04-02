import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PastelCard from '../../../components/ui/PastelCard/PastelCard';
import styles from './MemoryCard.module.css';
import { useTagResolver } from '../../../hooks/useTagResolver';

/**
 * MemoryCard — Premium Memory Gallery Item
 * High-end claymorphism aesthetic with framed motion animations.
 */
export default function MemoryCard({ memory, onEdit, onToggleVisibility, onDelete, index = 0 }) {
    const { resolveTags } = useTagResolver();
    const date = memory.eventDate ? new Date(memory.eventDate).toLocaleDateString('es-MX', {
        day: 'numeric', month: 'short', year: 'numeric',
    }) : '—';

    let photos = memory.photos || [];
    if (memory.mainPhotoUrl && !photos.includes(memory.mainPhotoUrl)) {
        photos = [memory.mainPhotoUrl, ...photos];
    }

    const hasPhotos = photos.length > 0;

    return (
        <PastelCard 
            className={`${styles.card} ${memory.isHidden ? styles.cardHidden : ''}`}
            padding="none"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
                type: 'spring', 
                damping: 20, 
                stiffness: 100, 
                delay: index * 0.08 // Staggered entry
            }}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
        >
            {/* Image Section */}
            <div className={styles.imageContainer}>
                {hasPhotos ? (
                    <div className={styles.photoWrapper}>
                        <img
                            src={photos[0]}
                            alt={memory.title ?? 'Recuerdo'}
                            className={styles.mainPhoto}
                            loading="lazy"
                        />
                        {photos.length > 1 && (
                            <div className={styles.photoCountStack}>
                                <span className="material-symbols-rounded">filter_none</span>
                                <span>{photos.length}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={styles.emptyPhoto}>
                        <span className="material-symbols-rounded">image</span>
                    </div>
                )}

                {/* Floating Badges */}
                <div className={styles.topBadges}>
                    {memory.isSpecial && (
                        <motion.div 
                            className={styles.badgeSpecial}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: index * 0.08 + 0.3 }}
                        >
                            <span className="material-symbols-rounded">stars</span>
                            <span>Especial</span>
                        </motion.div>
                    )}
                    {memory.isHidden && (
                        <div className={styles.badgeHidden}>
                            <span className="material-symbols-rounded">visibility_off</span>
                        </div>
                    )}
                </div>

                {/* Action Overlay (Glass Effect) */}
                <div className={styles.actionsOverlay}>
                    <div className={styles.actionButtons}>
                        <motion.button 
                            whileTap={{ scale: 0.9 }}
                            className={styles.actionBtn} 
                            onClick={onToggleVisibility} 
                            title={memory.isHidden ? "Mostrar" : "Ocultar"}
                        >
                            <span className="material-symbols-rounded">
                                {memory.isHidden ? 'visibility' : 'visibility_off'}
                            </span>
                        </motion.button>
                        <motion.button 
                            whileTap={{ scale: 0.9 }}
                            className={styles.actionBtn} 
                            onClick={onEdit} 
                            title="Editar"
                        >
                            <span className="material-symbols-rounded">edit</span>
                        </motion.button>
                        <motion.button 
                            whileTap={{ scale: 0.9 }}
                            className={`${styles.actionBtn} ${styles.deleteBtn}`} 
                            onClick={onDelete} 
                            title="Eliminar"
                        >
                            <span className="material-symbols-rounded">delete</span>
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className={styles.content}>
                <div className={styles.headerRow}>
                    <h3 className={styles.title}>{memory.title ?? 'Sin título'}</h3>
                </div>
                
                <div className={styles.metaRow}>
                    <div className={styles.metaItem}>
                        <span className="material-symbols-rounded">calendar_today</span>
                        <span>{date}</span>
                    </div>
                    {memory.placeName && (
                        <div className={styles.metaItem} title={memory.placeName}>
                            <span className="material-symbols-rounded">location_on</span>
                            <span className={styles.placeText}>{memory.placeName}</span>
                        </div>
                    )}
                </div>

                {memory.tags?.length > 0 && (
                    <div className={styles.tagCloud}>
                        {resolveTags(memory.tags).slice(0, 2).map(tagObj => (
                            <span key={tagObj.value} className={styles.tag}>
                                {tagObj.emoji} {tagObj.label.replace(/^[^\s]+\s+/, '')}
                            </span>
                        ))}
                        {memory.tags.length > 2 && (
                            <span className={styles.tagMore}>+{memory.tags.length - 2}</span>
                        )}
                    </div>
                )}
            </div>
        </PastelCard>
    );
}
