import { useState, useEffect } from 'react';
import styles from './CitaOverlay.module.css';
import { logToVercel } from '../../utils/vercelLogger';
import { autoDetectMetadata } from '../../utils/extractGpsFromFile';
import CameraPermissionGate from '../ui/CameraPermissionGate/CameraPermissionGate';

export default function CitaOverlay({ citaContext, onClose, onSave }) {
    useEffect(() => {
        logToVercel('CitaOverlay', 'MOUNTED', `Cita type: ${citaContext?.type}`);
    }, []);

    const [sessionPhotos, setSessionPhotos] = useState([]); // Array of { file, previewUrl }
    const [warningOpen, setWarningOpen] = useState(false);
    const [metadataStatus, setMetadataStatus] = useState('idle'); // 'idle' | 'detecting' | 'found' | 'not_found'

    const handleFileAdded = async (e) => {
        const files = Array.from(e.target.files || []);
        logToVercel('CitaOverlay', 'INPUT_ONCHANGE', `Target files length: ${files.length}`);
        
        if (files.length > 0) {
            // First photo? Start metadata detection
            if (sessionPhotos.length === 0) {
                setMetadataStatus('detecting');
                autoDetectMetadata(files[0]).then(meta => {
                    if (meta && (meta.lat || meta.source === 'exif')) {
                        setMetadataStatus('found');
                    } else {
                        setMetadataStatus('not_found');
                    }
                }).catch(() => setMetadataStatus('not_found'));
            }

            const newPhotos = files.map(file => {
                logToVercel('CitaOverlay', 'FILE_SELECTED', `Name: ${file.name}, Size: ${file.size}`);
                return {
                    file,
                    previewUrl: URL.createObjectURL(file)
                };
            });
            setSessionPhotos(prev => [...prev, ...newPhotos]);
        }
        e.target.value = '';
    };

    const handleImageError = (e) => {
        e.target.onerror = null;
        e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%2388d8b0"/><path d="M42 22H22c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V24c0-1.1-.9-2-2-2zm0 18H22V24h20v16z" fill="white"/><path d="M30.5 33.33L27 36.5l-3-4-4 5.5h18z" fill="white"/></svg>';
    };

    const minPhotos = citaContext?.minPhotos ?? 0;
    const isComplete = sessionPhotos.length >= minPhotos;

    return (
        <div className={styles.citaOverlay}>
            <CameraPermissionGate onCancel={onClose}>
                <div className={styles.citaCard} onClick={e => e.stopPropagation()}>
                    <div className={styles.citaHeader}>
                        <div className={styles.citaHeaderInfo}>
                            <p className={styles.citaLive}>
                                <span className={styles.pulseDot}></span>
                                Modo Cita
                            </p>
                        </div>
                        <button type="button" className={styles.citaClose} onClick={() => {
                            if (sessionPhotos.length > 0) {
                                setWarningOpen(true);
                            } else {
                                if (onClose) onClose();
                            }
                        }}>
                            <span className="material-symbols-rounded">close</span>
                        </button>
                    </div>

                    <p className={styles.citaSub}>
                        {metadataStatus === 'idle' && 'Selecciona una foto para empezar ✨'}
                        {metadataStatus === 'detecting' && 'Detectando tu ubicación... 📍'}
                        {metadataStatus === 'found' && '📍 ¡Ubicación detectada!'}
                        {metadataStatus === 'not_found' && 'Ubicación no encontrada en la foto 📸'}
                    </p>
                    <div className={styles.separator}></div>

                    {citaContext?.type === 'bingo' && (
                        <div className={styles.bingoPill}>
                            {citaContext?.bingoLabel || '📍 Bingo'}
                        </div>
                    )}

                    <div className={styles.progressRow}>
                        <div className={styles.circles}>
                            {Array.from({ length: minPhotos }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`${styles.circle} ${i < sessionPhotos.length ? styles.circleFilled : ''}`}
                                />
                            ))}
                        </div>
                        <span className={`${styles.progressLabel} ${isComplete ? styles.progressComplete : ''}`}>
                            {isComplete
                                ? "✅ ¡Cita completada! Puedes seguir subiendo fotos"
                                : `${sessionPhotos.length}/${minPhotos} fotos para completar la cita`}
                        </span>
                    </div>

                    <label
                        className={styles.bigCamera}
                        style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                        onClick={() => logToVercel('Cita_Label_Camera', 'CLICK', 'Label was clicked')}
                        onTouchStart={() => logToVercel('Cita_Label_Camera', 'TOUCHSTART', 'Label touch start')}
                        onTouchEnd={(e) => {
                            logToVercel('Cita_Label_Camera', 'TOUCHEND', 'Label touch end');
                            e.stopPropagation(); // Prevenir propagación a Leaklets de fondo
                        }}
                    >
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileAdded}
                            onClick={(e) => logToVercel('Cita_Input_Camera', 'CLICK', `Input clicked. Cancelable: ${e.cancelable}, isTrusted: ${e.isTrusted}`)}
                            onTouchStart={() => logToVercel('Cita_Input_Camera', 'TOUCHSTART', 'Direct tap on input began')}
                            onTouchEnd={() => logToVercel('Cita_Input_Camera', 'TOUCHEND', 'Direct tap on input ended')}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, zIndex: 100, cursor: 'pointer', touchAction: 'manipulation' }}
                        />
                        <span className="material-symbols-rounded">add_a_photo</span>
                    </label>
                    <p className={styles.bigCameraLabel}>Toma una foto</p>

                    <div className={styles.citaActions}>
                        <label
                            className={`${styles.citaAction} ${sessionPhotos.length === 0 ? styles.citaActionDisabled : ''}`}
                            style={{ 
                                cursor: sessionPhotos.length === 0 ? 'not-allowed' : 'pointer', 
                                position: 'relative', 
                                overflow: 'hidden',
                                opacity: sessionPhotos.length === 0 ? 0.6 : 1
                            }}
                            onClick={() => {
                                if (sessionPhotos.length === 0) {
                                    logToVercel('Cita_Label_Gallery', 'BLOCKED', 'Gallery blocked - first photo must be from camera');
                                    return;
                                }
                                logToVercel('Cita_Label_Gallery', 'CLICK', 'Label was clicked');
                            }}
                            onTouchStart={() => {
                                if (sessionPhotos.length > 0) logToVercel('Cita_Label_Gallery', 'TOUCHSTART', 'Label touch start');
                            }}
                            onTouchEnd={(e) => {
                                if (sessionPhotos.length === 0) {
                                    e.preventDefault();
                                    return;
                                }
                                logToVercel('Cita_Label_Gallery', 'TOUCHEND', 'Label touch end');
                                e.stopPropagation();
                            }}
                        >
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                disabled={sessionPhotos.length === 0}
                                onChange={handleFileAdded}
                                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, zIndex: 100, cursor: sessionPhotos.length === 0 ? 'not-allowed' : 'pointer', touchAction: 'manipulation' }}
                            />
                            <span className="material-symbols-rounded">photo_library</span>
                            Galería
                        </label>

                        <button
                            type="button"
                            className={`${styles.citaAction} ${sessionPhotos.length === 0 ? styles.citaActionDisabled : ''}`}
                            disabled={sessionPhotos.length === 0}
                        >
                            <span className="material-symbols-rounded">confirmation_number</span>
                            Boleto
                        </button>
                    </div>

                    {sessionPhotos.length > 0 && (
                        <div className={styles.sessionPhotosStrip}>
                            {sessionPhotos.map((item, i) => (
                                <img
                                    key={i}
                                    src={item.previewUrl}
                                    alt=""
                                    className={styles.sessionPhotoThumb}
                                    onError={handleImageError}
                                />
                            ))}
                        </div>
                    )}

                    {isComplete && (
                        <button
                            className={styles.saveBtn}
                            onClick={() => {
                                if (onSave) {
                                    const files = sessionPhotos.map(p => p.file);
                                    onSave(files);
                                }
                            }}
                        >
                            <span className="material-symbols-rounded">check_circle</span>
                            Guardar Cita
                        </button>
                    )}

                    {warningOpen && (
                        <div className={styles.warningBox}>
                            <p>¿Salir sin guardar? Perderás las fotos.</p>
                            <div className={styles.warningActions}>
                                <button
                                    type="button"
                                    className={styles.warningBtnPrimary}
                                    onClick={() => setWarningOpen(false)}
                                >
                                    Seguir
                                </button>
                                <button
                                    type="button"
                                    className={styles.warningBtnSecondary}
                                    onClick={() => {
                                        setWarningOpen(false);
                                        if (onClose) onClose();
                                    }}
                                >
                                    Salir sin guardar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </CameraPermissionGate>
        </div>
    );
}
