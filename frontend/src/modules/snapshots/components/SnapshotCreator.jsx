import { useState, useRef, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../services/firebase';
import styles from './SnapshotCreator.module.css';

/**
 * SnapshotCreator — Camera capture screen.
 * Captures a photo, previews it, uploads to Firebase Storage,
 * then creates a Firestore doc in `instantaneas`.
 */
export default function SnapshotCreator({ onClose }) {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const fileInputRef = useRef(null);

    // Auto-open camera on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            fileInputRef.current?.click();
        }, 100);
        return () => clearTimeout(timer);
    }, []);

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
            const path = `instantaneas/${uuid}/photo.jpg`;
            const fileRef = storageRef(storage, path);

            await uploadBytes(fileRef, selectedFile);
            const photoUrl = await getDownloadURL(fileRef);

            await addDoc(collection(db, 'instantaneas'), {
                photoUrl,
                storagePath: path,
                message: '',
                isSeen: false,
                seenAt: null,
                createdAt: serverTimestamp(),
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
                capture="environment"
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
