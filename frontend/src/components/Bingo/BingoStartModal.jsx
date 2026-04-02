import { motion } from 'framer-motion';
import { useAppConfig } from '../../context/AppConfigContext';
import { usePlaces } from '../../modules/map/hooks/usePlaces';
import styles from './BingoStartModal.module.css';

export default function BingoStartModal({ bingoItem, onClose, onStartCita, defaultMinPhotos = 3 }) {
    const { places } = usePlaces();
    const { memoryTags = [] } = useAppConfig();
    const minPhotosVal = bingoItem.minPhotos || defaultMinPhotos;

    // Build a lookup map: id → { label, emoji }
    const tagMap = Object.fromEntries(memoryTags.map(t => [t.id, t]));

    const matchedPlace = (places || []).find(p => p.name === bingoItem.suggestedPlace);

    const handleStartCita = () => {
        if (onStartCita) {
            onStartCita({
                type: 'bingo',
                categoryId: bingoItem.id,
                bingoLabel: `${bingoItem.emoji} ${bingoItem.title}`,
                minPhotos: minPhotosVal,
                description: bingoItem.description,
                // Pass tag IDs — the new format
                tags: (bingoItem.suggestedTags || []).map(t => t.id || t)
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
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.iconWrapper}>
                        <span className={bingoItem.emoji === 'favorite' || bingoItem.emoji === 'help_outline' ? `${styles.emoji} material-symbols-rounded ${styles.materialEmoji}` : styles.emoji}>
                            {bingoItem.emoji}
                        </span>
                    </div>
                    <h2 className={styles.title}>{bingoItem.title}</h2>

                    <div className={styles.rulesBox}>
                        <p className={styles.description}>
                            {bingoItem.description || 'Cumple con este reto tomando fotos para documentar el momento.'}
                        </p>
                        
                        <div className={styles.reqs}>
                            <span className="material-symbols-rounded" style={{ fontSize: '1.25rem' }}>photo_camera</span>
                            <span>Mínimo {minPhotosVal} fotos</span>
                        </div>

                        {bingoItem.suggestedPlace && (
                            <div className={styles.suggestedPlaceBox}>
                                <span className="material-symbols-rounded" style={{ fontSize: '1.2rem', color: '#ff85a2' }}>location_on</span>
                                <span className={styles.placeLabel}>
                                    {matchedPlace ? `${matchedPlace.emoji} ${matchedPlace.name}` : bingoItem.suggestedPlace}
                                </span>
                            </div>
                        )}

                        {bingoItem.suggestedTags?.length > 0 && (
                            <div className={styles.tagsContainer}>
                                {bingoItem.suggestedTags.map(tag => {
                                    const tagId = tag.id || tag;
                                    const resolved = tagMap[tagId];
                                    if (!resolved) return null;
                                    return (
                                        <span key={tagId} className={styles.tagPill}>
                                            {resolved.emoji} {resolved.label}
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
                        <span className="material-symbols-rounded">play_arrow</span>
                        ¡Comenzar Cita!
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
