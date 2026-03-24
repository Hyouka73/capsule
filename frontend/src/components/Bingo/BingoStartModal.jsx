import { motion } from 'framer-motion';
import { MEMORY_TAGS } from '../../config/constants';
import styles from './BingoStartModal.module.css';

export default function BingoStartModal({ bingoItem, onClose, onStartCita, defaultMinPhotos = 3 }) {
    const minPhotosVal = bingoItem.minPhotos || defaultMinPhotos;

    const handleStartCita = () => {
        if (onStartCita) {
            onStartCita({
                type: 'bingo',
                categoryId: bingoItem.id,
                bingoLabel: `${bingoItem.emoji} ${bingoItem.title}`,
                minPhotos: minPhotosVal,
                description: bingoItem.description,
                tags: (bingoItem.suggestedTags || []).map(t => typeof t === 'string' ? t : t.value)
            });
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <motion.div
                className={styles.card}
                onClick={e => e.stopPropagation()}
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                transition={{ type: 'spring', damping: 15, stiffness: 120 }}
            >
                <div className={styles.header}>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.iconWrapper}>
                        <span className={bingoItem.emoji === 'favorite' || bingoItem.emoji === 'help_outline' ? `${styles.emoji} material-symbols-outlined ${styles.materialEmoji}` : styles.emoji}>
                            {bingoItem.emoji}
                        </span>
                    </div>
                    <h2 className={styles.title}>{bingoItem.title}</h2>

                    <div className={styles.rulesBox}>
                        <p className={styles.description}>
                            {bingoItem.description || 'Cumple con este reto tomando fotos para documentar el momento.'}
                        </p>
                        
                        <div className={styles.reqs}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>photo_camera</span>
                            <span>Mínimo {minPhotosVal} fotos</span>
                        </div>

                        {bingoItem.suggestedTags?.length > 0 && (
                            <div className={styles.tagsContainer}>
                                {bingoItem.suggestedTags.map(tag => {
                                    const tagValue = typeof tag === 'string' ? tag : tag.value;
                                    const tagLabel = typeof tag === 'string' 
                                        ? (Object.values(MEMORY_TAGS).find(t => t.value === tag)?.label || tag)
                                        : tag.label;
                                    return (
                                        <span key={tagValue} className={styles.tagPill}>
                                            {tagLabel}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <p className={styles.hint}>
                        Inicia la cita para marcar esta casilla.
                    </p>

                    <button className={styles.startBtn} onClick={handleStartCita}>
                        <span className="material-symbols-outlined">play_arrow</span>
                        ¡Comenzar Cita!
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
