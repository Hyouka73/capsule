import { useState, useRef } from 'react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../services/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { createSnapshot } from '../../../apiClient';
import styles from './SnapshotCreator.module.css';

/**
 * SnapshotCreator — Camera capture screen.
 * Captures a photo, previews it, uploads to Firebase Storage,
 * then creates a Firestore doc via Cloud Function.
 */
export default function SnapshotCreator({ onClose }) {
    const { user } = useAuth(); // eslint-disable-line no-unused-vars
    const [previewUrl, setPreviewUrl] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const fileInputRef = useRef(null);

    // ⚠️ NOTE: We use a <label> wrapping the <input> so tapping the pillow
    // directly triggers the OS camera without needing JavaScript .click().
    // This is the ONLY reliable way on iOS Safari and Android PWAs.

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

            <input
                type="file"
                accept="image/*"
                capture="environment"
                id="snapshot-camera-input"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />

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

                {/* Pillow — camera trigger (label) or preview */}
                {previewUrl ? (
                    <div className={styles.squircle}>
                        <img
                            src={previewUrl}
                            alt="Vista previa"
                            className={styles.preview}
                        />
                    </div>
                ) : (
                    <label htmlFor="snapshot-camera-input" className={styles.squircle}>
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
