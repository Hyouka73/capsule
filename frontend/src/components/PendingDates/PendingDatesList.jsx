import React from 'react';
import { motion } from 'framer-motion';
import styles from './PendingDatesList.module.css';

export default function PendingDatesList({ pendingDates, onClose, onSelectDate }) {
    return (
        <motion.div
            className={styles.overlay}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
            <div className={styles.orbTopLeft}></div>
            <div className={styles.orbBottomRight}></div>

            <div className={styles.contentWrapper}>
                <div className={styles.header}>
                    <div className={styles.headerText}>
                        <h3 className={styles.title}>Citas sin clasificar</h3>
                        <p className={styles.subtitle}>Selecciona un recuerdo para guardarlo en el mapa.</p>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {pendingDates.length === 0 ? (
                    <div className={styles.emptyState}>
                        <span className={`material-symbols-outlined ${styles.emptyIcon}`}>map</span>
                        <p className={styles.emptyText}>Todo guardado en el mapa 💚</p>
                    </div>
                ) : (
                    <div className={styles.list}>
                        {pendingDates.map((pd, idx) => (
                            <motion.div
                                key={idx}
                                className={styles.listItem}
                                onClick={() => onSelectDate(pd)}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className={styles.thumbWrapper}>
                                    {pd.coverPhoto ? (
                                        <img
                                            src={pd.coverPhoto}
                                            alt="Recuerdo"
                                            className={styles.thumb}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div className={styles.thumbFallback} style={{ display: pd.coverPhoto ? 'none' : 'flex' }}>
                                        <span className="material-symbols-outlined">photo_camera</span>
                                    </div>
                                </div>

                                <div className={styles.info}>
                                    <span className={styles.date}>{pd.originalDate}</span>
                                    <span className={styles.photoCount}>
                                        <span className={`material-symbols-outlined ${styles.photoCountIcon}`}>photo_library</span>
                                        {pd.photos.length} {pd.photos.length === 1 ? 'foto' : 'fotos'}
                                    </span>
                                </div>
                                <span className={`material-symbols-outlined ${styles.arrow}`}>chevron_right</span>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
