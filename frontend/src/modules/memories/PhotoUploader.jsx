import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { compressImage } from '../../services/storage';
import { autoDetectMetadata } from '../../utils/extractGpsFromFile';
import Button from '../../components/ui/Button/Button';
import styles from './PhotoUploader.module.css';
import { logToVercel } from '../../utils/vercelLogger';
import CameraPermissionGate from '../../components/ui/CameraPermissionGate/CameraPermissionGate';
import { toast } from '../../components/ui/PastelToast/PastelToast';

// Solo imágenes permitidas — ver 03_FLUJOS_REFINADOS.txt Módulo 8
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];

export default function PhotoUploader({ 
    onDone, 
    onMetadataDetected, 
    onPhotosChange
}) {
    const { user } = useAuth();
    const [uploads, setUploads] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    // Clean up URLs on unmount
    useEffect(() => {
        return () => {
            uploads.forEach(u => {
                if (u.previewUrl) URL.revokeObjectURL(u.previewUrl);
            });
        };
    }, [uploads]);

    const processFiles = useCallback(async (files) => {
        setIsProcessing(true);
        const processedFiles = [];

        for (const file of files) {
            // 0. Validation
            const extension = file.name.split('.').pop().toLowerCase();
            const isValidExtension = ALLOWED_EXTENSIONS.includes(extension);
            const isValidMime = ALLOWED_MIME_TYPES.includes(file.type);

            if (!isValidExtension || !isValidMime) {
                toast.error("⚠️ Solo se permiten imágenes", "JPG, PNG o WebP son los formatos ideales.");
                logToVercel('PhotoUploader', 'INVALID_FILE_TYPE', `Ext: ${extension}, Type: ${file.type}`);
                continue;
            }

            const id = Math.random().toString(36).substring(7);
            
            // 1. Immediate Compression (RAM optimization)
            let compressedBlob;
            let previewUrl;
            let finalFile;

            try {
                compressedBlob = await compressImage(file);
                previewUrl = URL.createObjectURL(compressedBlob);
                finalFile = compressedBlob;
            } catch (err) {
                logToVercel('PhotoUploader', 'COMPRESS_ERROR', err.message);
                // Fallback to original file if compression fails
                previewUrl = URL.createObjectURL(file);
                finalFile = file;
            }
            
            const photoItem = {
                id,
                file: finalFile,
                previewUrl,
                originalName: file.name,
                status: 'ready',
                isMain: uploads.length === 0 && processedFiles.length === 0
            };

            processedFiles.push(photoItem);
            setUploads(prev => [...prev, photoItem]);

            // Metadata Detection (first file only)
            if (onMetadataDetected && processedFiles.length === 1) {
                // We use the original file for metadata because compression might strip EXIF
                autoDetectMetadata(file).then(metadata => {
                    if (metadata) onMetadataDetected(metadata);
                }).catch((err) => {
                    logToVercel('PhotoUploader', 'METADATA_ERROR', err.message);
                });
            }
        }

        // Notify parent to save in Draft
        if (onPhotosChange) {
            onPhotosChange(processedFiles.map(p => ({ 
                file: p.file, 
                isMain: p.isMain,
                originalName: p.originalName
            })));
        }

        setIsProcessing(false);
    }, [onMetadataDetected, onPhotosChange]);

    // Simplified: No auto-upload here. Parent (MemoryForm) handles final queuing.

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
                        <span className="material-symbols-rounded">add_a_photo</span>
                        Cámara
                    </label>
                </CameraPermissionGate>

                <label
                    style={{ 
                        position: 'relative', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        cursor: uploads.length === 0 ? 'not-allowed' : 'pointer', 
                        padding: '10px 20px', 
                        backgroundColor: '#eef2f5', 
                        borderRadius: '8px', 
                        fontWeight: '500', 
                        border: 'none', 
                        overflow: 'hidden',
                        opacity: uploads.length === 0 ? 0.6 : 1
                    }}
                    onClick={() => {
                        if (uploads.length === 0) {
                            logToVercel('Photo_Label_Gallery', 'BLOCKED', 'Gallery blocked - first photo must be from camera');
                            return;
                        }
                        logToVercel('Photo_Label_Gallery', 'CLICK', 'Label was clicked');
                    }}
                    onTouchStart={() => {
                        if (uploads.length > 0) logToVercel('Photo_Label_Gallery', 'TOUCHSTART', 'Label touch start');
                    }}
                    onTouchEnd={(e) => {
                        if (uploads.length === 0) {
                            e.preventDefault();
                            return;
                        }
                        logToVercel('Photo_Label_Gallery', 'TOUCHEND', 'Label touch end');
                        e.stopPropagation();
                    }}
                >
                    <input
                        ref={galleryInputRef}
                        type="file"
                        multiple
                        disabled={uploads.length === 0}
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, zIndex: 100, cursor: uploads.length === 0 ? 'not-allowed' : 'pointer', touchAction: 'manipulation' }}
                    />
                    <span className="material-symbols-rounded">photo_library</span>
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
                                <img src={upload.previewUrl} alt="Preview" className={styles.thumbImage} />
                                <div className={styles.statusOverlay}>
                                    {upload.status === 'processing' && <span className={styles.spinner}></span>}
                                    {upload.status === 'ready' && <span>✅</span>}
                                    {upload.status === 'error' && <span>❌</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div className={styles.actions}>
                <Button variant="primary" size="lg" onClick={onDone} disabled={uploads.length === 0 || isProcessing}>
                    Siguiente
                </Button>
            </div>
        </div>
    );
}
