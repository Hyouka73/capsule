import React from 'react';
import styles from './PendingDatesList.module.css';

export default function PendingDatesList({ pendingDates, onClose, onSelectDate }) {
    return (
        <div className={styles.overlay}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Citas sin clasificar</h3>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <p className={styles.subtitle}>Selecciona un recuerdo para guardarlo en el mapa.</p>

                <div className={styles.list}>
                    {pendingDates.map((pd, idx) => (
                        <div key={idx} className={styles.listItem} onClick={() => onSelectDate(pd)}>
                            <img src={pd.coverPhoto} alt="Recuerdo" className={styles.thumb} />
                            <div className={styles.info}>
                                <span className={styles.date}>{pd.originalDate}</span>
                                <span className={styles.photoCount}>{pd.photos.length} fotos</span>
                            </div>
                            <span className={`material-symbols-outlined ${styles.arrow}`}>chevron_right</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
