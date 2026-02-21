import React, { useState } from 'react';
import styles from './CitaOverlay.module.css';

export default function CitaOverlay({ citaContext, onClose, onSave }) {
    const [sessionPhotos, setSessionPhotos] = useState([]);
    const [warningOpen, setWarningOpen] = useState(false);

    const handleImageError = (e) => {
        e.target.onerror = null;
        e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%2388d8b0"/><path d="M22 22h20v20H22z" fill="none"/><path d="M42 22H22c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V24c0-1.1-.9-2-2-2zm0 18H22V24h20v16zm-11.5-6.67L27 36.5l-3-4-4 5.5h18l-5.5-7.33z" fill="white"/></svg>';
    };

    return (
        <div className={styles.citaOverlay}>
            <div className={styles.citaCard}>
                <div className={styles.citaHeader}>
                    <div>
                        <p className={styles.citaLive}>🟢 Modo Cita</p>
                    </div>
                    <button className={styles.citaClose} onClick={() => {
                        if (sessionPhotos.length < citaContext.minPhotos) {
                            setWarningOpen(true);
                        } else {
                            if (onSave) onSave();
                        }
                    }}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <p className={styles.citaSub}>Detectando tu ubicación...</p>

                <div className={styles.separator}></div>

                {citaContext.type === 'bingo' && (
                    <div className={styles.bingoPill}>
                        {citaContext.bingoLabel || '📍 Bingo'}
                    </div>
                )}

                <div className={styles.progressRow}>
                    <div className={styles.circles}>
                        {Array.from({ length: citaContext.minPhotos }).map((_, i) => (
                            <div key={i} className={`${styles.circle} ${i < sessionPhotos.length ? styles.circleFilled : ''}`} />
                        ))}
                    </div>
                    <span className={`${styles.progressLabel} ${sessionPhotos.length >= citaContext.minPhotos ? styles.progressComplete : ''}`}>
                        {sessionPhotos.length >= citaContext.minPhotos
                            ? "✅ ¡Cita completada! Puedes seguir subiendo fotos"
                            : `${sessionPhotos.length}/${citaContext.minPhotos} fotos para completar la cita`}
                    </span>
                </div>

                <button className={styles.bigCamera} onClick={() => {
                    const UNSPLASH_URLS = [
                        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80',
                        'https://images.unsplash.com/photo-1585647347384-2593bc35786b?auto=format&fit=crop&w=200&q=80',
                        'https://images.unsplash.com/photo-1481070555726-e2fe83477d4a?auto=format&fit=crop&w=200&q=80',
                        'https://images.unsplash.com/photo-1582216669966-22ac585a73e5?auto=format&fit=crop&w=200&q=80',
                        'https://images.unsplash.com/photo-1522748906645-95d8ad85fa4b?auto=format&fit=crop&w=200&q=80',
                        'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=200&q=80',
                    ];
                    const randomUrl = UNSPLASH_URLS[Math.floor(Math.random() * UNSPLASH_URLS.length)];
                    setSessionPhotos([...sessionPhotos, randomUrl]);
                }}>
                    <span className="material-symbols-outlined">add_a_photo</span>
                </button>
                <p className={styles.bigCameraLabel}>Toma una foto</p>

                <div className={styles.citaActions}>
                    <button className={styles.citaAction}>
                        <span className="material-symbols-outlined">photo_library</span>
                        Galería
                    </button>
                    <button className={styles.citaAction}>
                        <span className="material-symbols-outlined">confirmation_number</span>
                        Boleto
                    </button>
                </div>

                {sessionPhotos.length > 0 && (
                    <div className={styles.sessionPhotosStrip}>
                        {sessionPhotos.map((url, i) => (
                            <img key={i} src={url} alt="" className={styles.sessionPhotoThumb} onError={handleImageError} />
                        ))}
                    </div>
                )}

                {warningOpen && (
                    <div className={styles.warningBox}>
                        <p>Aún no hay suficientes fotos para completar la cita. ¿Salir de todas formas?</p>
                        <div className={styles.warningActions}>
                            <button className={styles.warningBtnPrimary} onClick={() => setWarningOpen(false)}>Seguir</button>
                            <button className={styles.warningBtnSecondary} onClick={() => {
                                setWarningOpen(false);
                                if (onClose) onClose();
                            }}>Salir sin guardar</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
