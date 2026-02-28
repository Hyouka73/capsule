import { useState, useRef, useEffect } from 'react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../services/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { createSnapshot } from '../../../apiClient';
import styles from './SnapshotCreator.module.css';

/**
 * SnapshotCreator — Camera capture screen.
 * Uses a <label> with a nested hidden <input type="file" capture="environment">
 * to open the native camera on mobile devices.
 */
export default function SnapshotCreator({ onClose }) {
    const { user } = useAuth(); // eslint-disable-line no-unused-vars
    const [previewUrl, setPreviewUrl] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isSending, setIsSending] = useState(false);

    // Proactively request camera permission on mount so the OS prompts the user
    useEffect(() => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    // We got permission — immediately stop the stream
                    // (we only needed to trigger the permission dialog)
                    stream.getTracks().forEach(t => t.stop());
                })
                .catch(() => {
                    // Permission denied or unavailable — that's okay,
                    // the <input capture> will still try its best
                    console.warn('[SnapshotCreator] Camera permission not granted, falling back to input capture');
                });
        }
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        // Reset so the same file can be re-selected
        e.target.value = '';
    };

    const handleSend = async () => {
        if (!selectedFile || isSending) return;
        setIsSending(true);

        try {
            const uuid = crypto.randomUUID();
            const path = `instantaneas/${uuid}/original.jpg`;
            const fileRef = storageRef(storage, path);

            // Upload direct to Storage
            await uploadBytes(fileRef, selectedFile);
            const photoUrl = await getDownloadURL(fileRef);

            // Save to DB via Cloud Function
            await createSnapshot({
                storagePath: path,
                photoUrl,
                message: '',
            });

            onClose();
        } catch (err) {
            console.error('Error uploading snapshot:', err);
            setIsSending(false);
        }
    };

    return (
        <div className={styles.overlay}>
            {/* Close */}
            <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
                ✕
            </button>

            <div className={styles.content}>
                {/* Pillow clip definition */}
                <svg height="0" width="0" style={{ position: 'absolute' }}>
                    <defs>
                        <clipPath clipPathUnits="objectBoundingBox" id="pillowClip">
                            <path
                                d="M0.5,0 C0.42,0 0,0.42 0,0.5 C0,0.58 0.42,1 0.5,1 C0.58,1 1,0.58 1,0.5 C1,0.42 0.58,0 0.5,0 Z"
                                transform="rotate(45 0.5 0.5)"
                            />
                        </clipPath>
                    </defs>
                </svg>

                {/* Pillow — camera trigger or preview */}
                {previewUrl ? (
                    <div className={styles.squircle}>
                        <img
                            src={previewUrl}
                            alt="Vista previa"
                            className={styles.preview}
                        />
                    </div>
                ) : (
                    <label className={styles.squircle} style={{ cursor: 'pointer' }}>
                        {/* Hidden input INSIDE the label — most reliable cross-browser pattern */}
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileChange}
                            style={{ position: 'absolute', width: 0, height: 0, opacity: 0, overflow: 'hidden' }}
                        />
                        <div className={styles.placeholder}>
                            <span className={styles.cameraEmoji}>📷</span>
                            <p className={styles.placeholderText}>Toca para abrir la cámara</p>
                        </div>
                    </label>
                )}

                {/* Send button — visible only when photo is selected */}
                {previewUrl && (
                    <button
                        className={styles.sendBtn}
                        onClick={handleSend}
                        disabled={isSending}
                    >
                        {isSending ? 'Enviando...' : 'Enviar 💌'}
                    </button>
                )}
            </div>
        </div>
    );
}

