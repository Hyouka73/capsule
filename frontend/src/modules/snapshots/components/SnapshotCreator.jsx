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

    // ⚠️ NOTE: We do NOT auto-open the camera with setTimeout.
    // On iOS/Safari, programmatic input.click() only works when called
    // DIRECTLY from a user gesture (tap). Any async delay (setTimeout, promise, etc.)
    // breaks the gesture trust chain and Safari silently blocks the picker.
    // The user taps the placeholder squircle which calls handleCapture directly.
    //
    // ⚠️ We do NOT use capture="environment" — on Android it can block the native
    // file picker sheet. Without it, the OS shows camera + gallery options natively.

    const handleCapture = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
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
                ref={fileInputRef}
                type="file"
                accept="image/*"
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

                {/* Pillow — capture area or preview */}
                <div
                    className={styles.squircle}
                    onClick={!previewUrl ? handleCapture : undefined}
                    role={!previewUrl ? 'button' : undefined}
                    tabIndex={!previewUrl ? 0 : undefined}
                >
                    {previewUrl ? (
                        <img
                            src={previewUrl}
                            alt="Vista previa"
                            className={styles.preview}
                        />
                    ) : (
                        <div className={styles.placeholder}>
                            <span className={styles.cameraEmoji}>📷</span>
                            <p className={styles.placeholderText}>Toca para enviar una foto</p>
                        </div>
                    )}
                </div>

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
