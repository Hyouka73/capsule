import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { logActivity } from '../../apiClient';
// Base Firebase SDK se usará temporalmente para subir a Storage, 
// dado que los archivos File de Input HTML no pueden enviarse vía JSON a Cloud Functions.
import { getStorage, ref, uploadBytesResumable } from 'firebase/storage';
import { app } from '../../services/firebase';
import { ACTIVITY_ACTIONS, ARTIFACT_TYPES } from '../../config/constants';
import { autoDetectGps } from '../../utils/extractGpsFromFile';
import Button from '../../components/ui/Button/Button';
import styles from './PhotoUploader.module.css';

export default function PhotoUploader({ memoryId, onDone, onGpsDetected }) {
    const { user } = useAuth();
    const [uploads, setUploads] = useState([]); // { id, file, progress, status, error }
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef(null);

    // Detect iOS — capture='environment' attribute on iOS forces camera-only
    // and prevents photo library selection, or is silently ignored in some browsers.
    // We omit it entirely on iOS and let the user choose via the native sheet.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    function updateUploadStatus(id, delta) {
        setUploads(current => current.map(u => u.id === id ? { ...u, ...delta } : u));
    }

    const onDrop = useCallback(async (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer?.files || e.target.files || []);
        if (files.length === 0) return;

        setIsProcessing(true);

        const newUploads = files.map(file => ({
            id: Math.random().toString(36).substring(7),
            file,
            progress: 0,
            status: 'pending',
        }));

        setUploads(prev => [...prev, ...newUploads]);

        // GPS auto-detect from first photo (runs in parallel, non-blocking)
        if (onGpsDetected && files.length > 0) {
            autoDetectGps(files[0]).then(coords => {
                if (coords) onGpsDetected(coords);
            }).catch(() => { /* silent */ });
        }

        const storage = getStorage(app);

        // Process each file
        for (const upload of newUploads) {
            try {
                updateUploadStatus(upload.id, { status: 'uploading', progress: 10 });

                // 1. Upload to Storage (Frontend solo sube el binario a Storage; Firebase Auth valida las Reglas)
                const storageRef = ref(storage, `memories/${memoryId}/photos/${upload.id}/original.jpg`);

                // Track progress
                const uploadTask = uploadBytesResumable(storageRef, upload.file, {
                    customMetadata: {
                        uploadedBy: user.uid,
                    }
                });

                await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            // Update UI progress (10% a 90%)
                            updateUploadStatus(upload.id, { progress: 10 + (progress * 0.8) });
                        },
                        (error) => reject(error),
                        () => resolve()
                    );
                });

                // 2. Log activity call (Serverless Endpoint)
                await logActivity({
                    action: ACTIVITY_ACTIONS.PHOTO_UPLOADED,
                    targetType: ARTIFACT_TYPES.PHOTO,
                    targetId: memoryId,
                    metadata: { fileName: upload.file.name },
                    displayText: `Subió una foto al recuerdo: ${upload.file.name}`
                }).catch(() => { });

                // Backend Trigger onObjectFinalized se encargará de: EXIF, Thumbnails y Firestore

                updateUploadStatus(upload.id, { status: 'success', progress: 100 });
            } catch (err) {
                console.error('Upload failed:', err);
                updateUploadStatus(upload.id, { status: 'error', error: 'Fallo al subir' });
            }
        }

        setIsProcessing(false);
    }, [memoryId, user.uid]);

    const allFinished = uploads.length > 0 && uploads.every(u => u.status === 'success' || u.status === 'error');

    return (
        <div className={styles.root}>
            <div
                className={styles.dropzone}
                onDragOver={e => e.preventDefault()}
                onDrop={onDrop}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    {...(!isIOS && { capture: 'environment' })}
                    onChange={onDrop}
                    id="file-input"
                    className={styles.hiddenInput}
                />
                <label htmlFor="file-input" className={styles.dropzoneLabel}>
                    <span className={styles.uploadIcon}>📸</span>
                    <p className={styles.dropTitle}>Suelta tus fotos aquí</p>
                    <p className={styles.dropSubtitle}>o haz clic para buscarlas</p>
                </label>
            </div>

            {uploads.length > 0 && (
                <div className={styles.previewGrid}>
                    {uploads.map(upload => (
                        <div key={upload.id} className={`${styles.previewItem} ${styles[upload.status]}`}>
                            <div className={styles.previewThumb}>
                                <div className={styles.statusOverlay}>
                                    {upload.status === 'uploading' && <span>{Math.round(upload.progress)}%</span>}
                                    {upload.status === 'success' && <span>✅</span>}
                                    {upload.status === 'error' && <span>❌</span>}
                                </div>
                            </div>
                            <div className={styles.progressBar}>
                                <div
                                    className={styles.progressFill}
                                    style={{ width: `${upload.progress}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className={styles.actions}>
                <Button
                    variant="primary"
                    size="lg"
                    onClick={onDone}
                    disabled={!allFinished || isProcessing}
                >
                    Finalizar
                </Button>
            </div>
        </div>
    );
}
