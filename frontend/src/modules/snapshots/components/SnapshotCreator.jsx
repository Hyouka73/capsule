import { useState } from 'react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../services/firebase';
import { createSnapshot } from '../../../apiClient';
import styles from './SnapshotCreator.module.css';

/**
 * SnapshotCreator
 * For maximum PWA compatibility on iOS/Android, we use standard <input type="file" capture="environment">
 * wrapped in a styled <label>. This guarantees the native camera opens without permission errors.
 */
export default function SnapshotCreator({ onClose }) {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [capturedBlob, setCapturedBlob] = useState(null);
    const [isSending, setIsSending] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCapturedBlob(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleRetake = () => {
        setPreviewUrl(null);
        setCapturedBlob(null);
    };

    const handleSend = async () => {
        if (!capturedBlob || isSending) return;
        setIsSending(true);
        try {
            const uuid = crypto.randomUUID();
            const path = `instantaneas/${uuid}/original.jpg`;
            const fileRef = storageRef(storage, path);
            await uploadBytes(fileRef, capturedBlob);
            const photoUrl = await getDownloadURL(fileRef);
            await createSnapshot({ storagePath: path, photoUrl, message: '' });
            onClose();
        } catch (err) {
            console.error('Error uploading snapshot:', err);
            setIsSending(false);
        }
    };

    return (
        <div className={styles.overlay}>
            {/* Close */}
            <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>

            <div className={styles.content}>
                {!previewUrl ? (
                    /* ── CAPTURE STATE ── */
                    <div className={styles.captureState}>
                        <div className={styles.cameraEmoji}>📷</div>
                        <h2 className={styles.captureHeader}>Tomar Instantánea</h2>
                        <p className={styles.captureText}>
                            Sube una foto rápida de lo que estás haciendo.
                        </p>

                        {/* 
                          Native robust file picker for camera.
                          Wrapped in a label so the user taps the label directly,
                          bypassing all PWA restriction blockers.
                        */}
                        <label className={styles.shutterBtn}>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleFileChange}
                                className={styles.hiddenInput}
                            />
                            <span className="material-symbols-outlined">photo_camera</span>
                            <span>Abrir Cámara</span>
                        </label>
                    </div>
                ) : (
                    /* ── PREVIEW STATE ── */
                    <div className={styles.previewWrapper}>
                        <img src={previewUrl} alt="Vista previa" className={styles.preview} />
                        <div className={styles.previewActions}>
                            <button className={styles.retakeBtn} onClick={handleRetake}>
                                <span className="material-symbols-outlined">replay</span>
                                Repetir
                            </button>
                            <button
                                className={styles.sendBtn}
                                onClick={handleSend}
                                disabled={isSending}
                            >
                                {isSending ? 'Enviando...' : 'Enviar 💌'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
