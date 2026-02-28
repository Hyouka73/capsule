import { useState, useRef, useEffect, useCallback } from 'react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../services/firebase';
import { createSnapshot } from '../../../apiClient';
import styles from './SnapshotCreator.module.css';

/**
 * SnapshotCreator — In-app camera viewfinder.
 * Uses getUserMedia to show a live camera stream.
 * Supports front/back camera toggle.
 * Captures a still, previews it, uploads to Firebase Storage,
 * then creates a Firestore doc via Cloud Function.
 */
export default function SnapshotCreator({ onClose }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    const [facingMode, setFacingMode] = useState('environment'); // 'environment' = rear, 'user' = front
    const [previewUrl, setPreviewUrl] = useState(null);
    const [capturedBlob, setCapturedBlob] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [cameraError, setCameraError] = useState(null);

    // Start camera stream
    const startCamera = useCallback(async (facing) => {
        // Stop any existing stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
        setCameraError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error('[SnapshotCreator] Camera error:', err);
            setCameraError('No se pudo acceder a la cámara. Verifica los permisos.');
        }
    }, []);

    // Stop camera stream on unmount
    useEffect(() => {
        startCamera(facingMode);
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);  // eslint-disable-line react-hooks/exhaustive-deps

    // Toggle front/back camera
    const handleFlip = async () => {
        const newFacing = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(newFacing);
        setPreviewUrl(null);
        setCapturedBlob(null);
        await startCamera(newFacing);
    };

    // Capture a still from the video stream
    const handleCapture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        // Mirror the image if using front camera
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0);

        canvas.toBlob(blob => {
            if (!blob) return;
            setCapturedBlob(blob);
            setPreviewUrl(URL.createObjectURL(blob));
            // Pause stream to save battery while previewing
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => { t.enabled = false; });
            }
        }, 'image/jpeg', 0.92);
    };

    // Retake — resume stream and clear preview
    const handleRetake = () => {
        setPreviewUrl(null);
        setCapturedBlob(null);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => { t.enabled = true; });
        }
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
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Close */}
            <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>

            <div className={styles.content}>
                {cameraError ? (
                    <div className={styles.errorState}>
                        <span className={styles.cameraEmoji}>📷</span>
                        <p className={styles.placeholderText}>{cameraError}</p>
                    </div>
                ) : !previewUrl ? (
                    /* ── VIEWFINDER ── */
                    <div className={styles.viewfinderWrapper}>
                        <video
                            ref={videoRef}
                            className={styles.viewfinder}
                            autoPlay
                            playsInline
                            muted
                            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                        />
                        <div className={styles.viewfinderControls}>
                            {/* Flip camera button */}
                            <button className={styles.flipBtn} onClick={handleFlip} aria-label="Voltear cámara">
                                <span className="material-symbols-outlined">flip_camera_ios</span>
                            </button>
                            {/* Shutter */}
                            <button className={styles.shutterBtn} onClick={handleCapture} aria-label="Tomar foto" />
                        </div>
                    </div>
                ) : (
                    /* ── PREVIEW ── */
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
