import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { logActivity } from '../../apiClient';
import { getStorage, ref, uploadBytesResumable } from 'firebase/storage';
import { app } from '../../services/firebase';
import { ACTIVITY_ACTIONS, ARTIFACT_TYPES } from '../../config/constants';
import { autoDetectGps } from '../../utils/extractGpsFromFile';
import Button from '../../components/ui/Button/Button';
import styles from './PhotoUploader.module.css';
import { logToVercel } from '../../utils/vercelLogger';
import CameraPermissionGate from '../../components/ui/CameraPermissionGate/CameraPermissionGate';

export default function PhotoUploader({ memoryId, onDone, onGpsDetected }) {
    useEffect(() => {
        logToVercel('PhotoUploader', 'MOUNTED', `Memory ID: ${memoryId}`);
    }, [memoryId]);
    const { user } = useAuth();
    const [uploads, setUploads] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    function updateUploadStatus(id, delta) {
        setUploads(current => current.map(u => u.id === id ? { ...u, ...delta } : u));
    }

    const processFiles = useCallback(async (files) => {
        setIsProcessing(true);
        const newUploads = files.map(file => ({
            id: Math.random().toString(36).substring(7),
            file,
            progress: 0,
            status: 'pending',
        }));
        setUploads(prev => [...prev, ...newUploads]);
        if (onGpsDetected && files.length > 0) {
            autoDetectGps(files[0]).then(coords => {
                if (coords) onGpsDetected(coords);
            }).catch(() => { });
        }
        const storage = getStorage(app);
        for (const upload of newUploads) {
            try {
                updateUploadStatus(upload.id, { status: 'uploading', progress: 10 });
                const storageRef = ref(storage, `memories/${memoryId}/photos/${upload.id}/original.jpg`);
                const uploadTask = uploadBytesResumable(storageRef, upload.file, {
                    customMetadata: { uploadedBy: user.uid }
                });
                await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            updateUploadStatus(upload.id, { progress: 10 + (progress * 0.8) });
                        },
                        (error) => reject(error),
                        () => resolve()
                    );
                });
                await logActivity({
                    action: ACTIVITY_ACTIONS.PHOTO_UPLOADED,
                    targetType: ARTIFACT_TYPES.PHOTO,
                    targetId: memoryId,
                    metadata: { fileName: upload.file.name },
                    displayText: `Subió una foto al recuerdo: ${upload.file.name}`
                }).catch(() => { });
                updateUploadStatus(upload.id, { status: 'success', progress: 100 });
            } catch (err) {
                console.error('Upload failed:', err);
                updateUploadStatus(upload.id, { status: 'error', error: 'Fallo al subir' });
            }
        }
        setIsProcessing(false);
    }, [memoryId, user.uid, onGpsDetected]);

    const onDrop = useCallback((e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer?.files || []);
        if (files.length === 0) return;
        processFiles(files);
    }, [processFiles]);

    const handleFileChange = useCallback((e) => {
        const files = Array.from(e.target.files || []);
        logToVercel('PhotoUploader', 'INPUT_ONCHANGE', `Files length: ${files.length}`);
        e.target.value = '';
        if (files.length === 0) return;
        processFiles(files);
    }, [processFiles]);

    const allFinished = uploads.length > 0 && uploads.every(u => u.status === 'success' || u.status === 'error');

    return (
        <div className={styles.root}>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1rem' }}>
                <CameraPermissionGate onCancel={() => logToVercel('PhotoUploader', 'PERMISSION_CANCELLED', 'User closed permission gate')}>
                    <label
                        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 20px', backgroundColor: '#eef2f5', borderRadius: '8px', fontWeight: '500', border: 'none', overflow: 'hidden' }}
                        onClick={() => logToVercel('Photo_Label_Camera', 'CLICK', 'Label was clicked')}
                        onTouchStart={() => logToVercel('Photo_Label_Camera', 'TOUCHSTART', 'Label touch start')}
                        onTouchEnd={(e) => {
                            logToVercel('Photo_Label_Camera', 'TOUCHEND', 'Label touch end');
                            e.stopPropagation();
                        }}
                    >
                        <input
                            ref={cameraInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileChange}
                            onClick={(e) => logToVercel('Photo_Input_Camera', 'CLICK', `Input clicked. Cancelable: ${e.cancelable}, isTrusted: ${e.isTrusted}`)}
                            onTouchStart={() => logToVercel('Photo_Input_Camera', 'TOUCHSTART', 'Direct tap on input began')}
                            onTouchEnd={() => logToVercel('Photo_Input_Camera', 'TOUCHEND', 'Direct tap on input ended')}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, zIndex: 100, cursor: 'pointer', touchAction: 'manipulation' }}
                        />
                        <span className="material-symbols-outlined">add_a_photo</span>
                        Cámara
                    </label>
                </CameraPermissionGate>

                <label
                    style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 20px', backgroundColor: '#eef2f5', borderRadius: '8px', fontWeight: '500', border: 'none', overflow: 'hidden' }}
                    onClick={() => logToVercel('Photo_Label_Gallery', 'CLICK', 'Label was clicked')}
                    onTouchStart={() => logToVercel('Photo_Label_Gallery', 'TOUCHSTART', 'Label touch start')}
                    onTouchEnd={(e) => {
                        logToVercel('Photo_Label_Gallery', 'TOUCHEND', 'Label touch end');
                        e.stopPropagation();
                    }}
                >
                    <input
                        ref={galleryInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                        onClick={(e) => logToVercel('Photo_Input_Gallery', 'CLICK', `Input was directly clicked. Cancelable: ${e.cancelable}`)}
                        onTouchStart={() => logToVercel('Photo_Input_Gallery', 'TOUCHSTART', 'Direct tap on input began')}
                        onTouchEnd={() => logToVercel('Photo_Input_Gallery', 'TOUCHEND', 'Direct tap on input ended')}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, zIndex: 100, cursor: 'pointer', touchAction: 'manipulation' }}
                    />
                    <span className="material-symbols-outlined">photo_library</span>
                    Galería
                </label>
            </div>
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
                    onChange={handleFileChange}
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
                                <div className={styles.progressFill} style={{ width: `${upload.progress}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div className={styles.actions}>
                <Button variant="primary" size="lg" onClick={onDone} disabled={!allFinished || isProcessing}>
                    Finalizar
                </Button>
            </div>
        </div>
    );
}
