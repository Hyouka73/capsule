import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import styles from './BingoStartModal.module.css';

export default function BingoStartModal({ bingoItem, onClose, onStartCita, defaultMinPhotos = 3 }) {
    const minPhotosVal = bingoItem.minPhotos || defaultMinPhotos;

    const handleStartCita = () => {
        if (onStartCita) {
            onStartCita({
                type: 'bingo',
                bingoLabel: `${bingoItem.emoji} ${bingoItem.title}`,
                minPhotos: minPhotosVal,
                description: bingoItem.description,
                tags: bingoItem.suggestedTags || []
            });
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <motion.div
                className={styles.card}
                onClick={e => e.stopPropagation()}
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
                <div className={styles.header}>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                <div className={styles.content}>
                    <div className={styles.iconWrapper}>
                        <span className={styles.emoji}>{bingoItem.emoji}</span>
                    </div>
                    <h2 className={styles.title}>{bingoItem.title}</h2>

                    <div className={styles.rulesBox}>
                        <p className={styles.description}>
                            {bingoItem.description || 'Cumple con este reto tomando fotos para documentar el momento.'}
                        </p>
                        <div className={styles.reqs}>
                            <span className="material-symbols-outlined">photo_camera</span>
                            <span>Mínimo {minPhotosVal} fotos requeridas</span>
                        </div>
                    </div>

                    <p className={styles.hint}>
                        Al presionar "Comenzar", se abrirá el mapa para iniciar la cita y tomar la foto de portada.
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
