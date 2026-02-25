import { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { storage, functions } from '../../../services/firebase';
import styles from './SnapshotCreator.module.css';

/**
 * SnapshotCreator — Modal to upload quick snapshots from Admin
 */
export default function SnapshotCreator({ onClose, onSuccess }) {
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [message, setMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setError(null);

        try {
            // 1. Upload to Storage: instantaneas/{id}/photo.jpg
            const id = crypto.randomUUID();
            const storagePath = `instantaneas/${id}/photo.jpg`;
            const imageRef = ref(storage, storagePath);

            await uploadBytes(imageRef, file);
            const photoUrl = await getDownloadURL(imageRef);

            // 2. Call the BFF to create the document and notify
            const createSnapshot = httpsCallable(functions, 'createSnapshot');
            await createSnapshot({
                photoUrl,
                storagePath,
                message: message.trim()
            });

            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Snapshot upload failed:', err);
            setError('Error al subir la instantánea. Intenta de nuevo.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <header className={styles.header}>
                    <h2>Nueva Instantánea ✨</h2>
                    <button className={styles.closeBtn} onClick={onClose} disabled={isUploading}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </header>

                <div className={styles.content}>
                    {!previewUrl ? (
                        <div
                            className={styles.uploadPlaceholder}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <span className="material-symbols-outlined">add_a_photo</span>
                            <p>Toca para elegir una foto</p>
                        </div>
                    ) : (
                        <div className={styles.previewContainer}>
                            <img src={previewUrl} alt="Preview" className={styles.preview} />
                            <button
                                className={styles.changeBtn}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                Cambiar foto
                            </button>
                        </div>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className={styles.hiddenInput}
                    />

                    <div className={styles.formGroup}>
                        <label>Mensaje corto (opcional)</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Escribe algo lindo... (max 80)"
                            maxLength={80}
                            disabled={isUploading}
                        />
                        <span className={styles.charCount}>{message.length}/80</span>
                    </div>

                    {error && <p className={styles.error}>{error}</p>}
                </div>

                <footer className={styles.footer}>
                    <button
                        className={styles.cancelBtn}
                        onClick={onClose}
                        disabled={isUploading}
                    >
                        Cancelar
                    </button>
                    <button
                        className={styles.submitBtn}
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                    >
                        {isUploading ? 'Enviando...' : 'Enviar Instantánea'}
                    </button>
                </footer>
            </div>
        </div>
    );
}
