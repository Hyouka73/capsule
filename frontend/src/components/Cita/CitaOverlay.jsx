import { useState, useEffect } from 'react';
import styles from './CitaOverlay.module.css';

export default function CitaOverlay({ citaContext, onClose, onSave }) {
    const [sessionPhotos, setSessionPhotos] = useState([]);
    const [warningOpen, setWarningOpen] = useState(false);

    // Proactively request camera permission so Chrome shows the dialog
    useEffect(() => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    stream.getTracks().forEach(t => t.stop());
                })
                .catch(() => {
                    console.warn('[CitaOverlay] Camera permission not granted');
                });
        }
    }, []);

    const handleFileAdded = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setSessionPhotos(prev => [...prev, objectUrl]);
        }
        // Reset input value so the same file can be chosen again if needed
        e.target.value = '';
    };

    const handleImageError = (e) => {
        e.target.onerror = null;
        e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%2388d8b0"/><path d="M22 22h20v20H22z" fill="none"/><path d="M42 22H22c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V24c0-1.1-.9-2-2-2zm0 18H22V24h20v16zm-11.5-6.67L27 36.5l-3-4-4 5.5h18l-5.5-7.33z" fill="white"/></svg>';
    };

    return (
        <div className={styles.citaOverlay}>
            <div className={styles.citaCard}>
                <div className={styles.citaHeader}>
                    <div className={styles.citaHeaderInfo}>
                        <p className={styles.citaLive}>
                            <span className={styles.pulseDot}></span>
                            Modo Cita
                        </p>
                    </div>
                    <button className={styles.citaClose} onClick={() => {
                        if (sessionPhotos.length > 0) {
                            setWarningOpen(true);
                        } else {
                            if (onClose) onClose();
                        }
                    }}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <p className={styles.citaSub}>Detectando tu ubicación...</p>

                <div className={styles.separator}></div>

                {citaContext?.type === 'bingo' && (
                    <div className={styles.bingoPill}>
                        {citaContext?.bingoLabel || '📍 Bingo'}
                    </div>
                )}

                <div className={styles.progressRow}>
                    <div className={styles.circles}>
                        {Array.from({ length: citaContext?.minPhotos ?? 0 }).map((_, i) => (
                            <div key={i} className={`${styles.circle} ${i < sessionPhotos.length ? styles.circleFilled : ''}`} />
                        ))}
                    </div>
                    <span className={`${styles.progressLabel} ${sessionPhotos.length >= (citaContext?.minPhotos ?? 0) ? styles.progressComplete : ''}`}>
                        {sessionPhotos.length >= (citaContext?.minPhotos ?? 0)
                            ? "✅ ¡Cita completada! Puedes seguir subiendo fotos"
                            : `${sessionPhotos.length}/${citaContext?.minPhotos ?? 0} fotos para completar la cita`}
                    </span>
                </div>

                <label className={styles.bigCamera} style={{ cursor: 'pointer' }}>
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileAdded}
                        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, overflow: 'hidden' }}
                    />
                    <span className="material-symbols-outlined">add_a_photo</span>
                </label>
                <p className={styles.bigCameraLabel}>Toma una foto</p>

                <div className={styles.citaActions}>
                    <label
                        className={`${styles.citaAction} ${sessionPhotos.length === 0 ? styles.citaActionDisabled : ''}`}
                        style={{ cursor: sessionPhotos.length > 0 ? 'pointer' : 'default' }}
                    >
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileAdded}
                            disabled={sessionPhotos.length === 0}
                            style={{ position: 'absolute', width: 0, height: 0, opacity: 0, overflow: 'hidden' }}
                        />
                        <span className="material-symbols-outlined">photo_library</span>
                        Galería
                    </label>
                    <button
                        className={`${styles.citaAction} ${sessionPhotos.length === 0 ? styles.citaActionDisabled : ''}`}
                        disabled={sessionPhotos.length === 0}
                    >
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

                {sessionPhotos.length >= (citaContext?.minPhotos ?? 0) && (
                    <button
                        className={styles.saveBtn}
                        onClick={() => { if (onSave) onSave(sessionPhotos); }}
                    >
                        <span className="material-symbols-outlined">check_circle</span>
                        Guardar Cita
                    </button>
                )}

                {warningOpen && (
                    <div className={styles.warningBox}>
                        <p>¿Salir sin guardar? Perderás las fotos.</p>
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
