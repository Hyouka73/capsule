import { useState, useRef, useEffect } from 'react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../services/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { createSnapshot } from '../../../apiClient';
import styles from './SnapshotCreator.module.css';
import { logToVercel } from '../../../utils/vercelLogger';
import { STORAGE_PATHS } from '../../../config/constants';
import CameraPermissionGate from '../../../components/ui/CameraPermissionGate/CameraPermissionGate';

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
    const [stream, setStream] = useState(null);
    const [isCameraLoading, setIsCameraLoading] = useState(true);
    const [facingMode, setFacingMode] = useState('environment'); // 'environment' or 'user'
    const [message, setMessage] = useState('');

    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        logToVercel('SnapshotCreator', 'MOUNTED', 'Component mounted');
        startCamera(facingMode);

        return () => {
            logToVercel('SnapshotCreator', 'UNMOUNT', 'Cleaning up stream and URL');
            stopCamera();
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [facingMode]); // Re-start when facingMode changes

    const startCamera = async (mode) => {
        setIsCameraLoading(true);
        stopCamera(); // Clean up previous stream
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: mode,
                    width: { ideal: 1080 },
                    height: { ideal: 1080 }
                },
                audio: false
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setIsCameraLoading(false);
            logToVercel('SnapshotCreator', 'CAMERA_STARTED', `WebRTC stream active (${mode})`);
        } catch (err) {
            console.error('Error starting camera:', err);
            logToVercel('SnapshotCreator', 'CAMERA_ERROR', err.message);
            setIsCameraLoading(false);
        }
    };

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Match canvas to video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw current frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to Blob
        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `snapshot_${Date.now()}.jpg`, { type: 'image/jpeg' });
                setSelectedFile(file);
                const url = URL.createObjectURL(blob);
                setPreviewUrl(url);
                logToVercel('SnapshotCreator', 'CAPTURE_SUCCESS', `File size: ${file.size}`);
                stopCamera();
            }
        }, 'image/jpeg', 0.85);
    };

    const handleRetake = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setSelectedFile(null);
        startCamera();
    };

    const handleSend = async () => {
        if (!selectedFile || isSending) return;
        setIsSending(true);

        try {
            const uuid = crypto.randomUUID();
            const path = STORAGE_PATHS.SNAPSHOT_ORIGINAL(uuid);
            const fileRef = storageRef(storage, path);

            // Upload direct to Storage
            await uploadBytes(fileRef, selectedFile);
            const photoUrl = await getDownloadURL(fileRef);

            // Save to DB via Cloud Function
            await createSnapshot({
                storagePath: path,
                photoUrl,
                message,
            });

            onClose();
        } catch (err) {
            console.error('Error uploading snapshot:', err);
            logToVercel('SnapshotCreator', 'UPLOAD_ERROR', err.message);
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
                <CameraPermissionGate onCancel={onClose}>
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

                    {/* Hidden Canvas for Capture */}
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    {/* Pillow — camera trigger or preview */}
                    <div className={styles.squircle}>
                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Vista previa"
                                className={styles.preview}
                            />
                        ) : (
                            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                <video
                                    ref={videoRef}
                                    className={styles.video}
                                    autoPlay
                                    playsInline
                                    muted
                                />
                                {isCameraLoading && (
                                    <div className={styles.placeholder} style={{ position: 'absolute', inset: 0, backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <p className={styles.placeholderText}>Cargando lente...</p>
                                    </div>
                                )}
                                {!isCameraLoading && (
                                    <button
                                        className={styles.flipBtn}
                                        onClick={toggleCamera}
                                        aria-label="Cambiar cámara"
                                    >
                                        <span className="material-symbols-outlined">flip_camera_ios</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className={styles.actions} style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                        {!previewUrl ? (
                            <button
                                className={styles.captureBtn}
                                onClick={handleCapture}
                                disabled={isCameraLoading}
                            >
                                <span className="material-symbols-outlined" style={{ marginRight: '8px', verticalAlign: 'middle' }}>photo_camera</span>
                                Disparar
                            </button>
                        ) : (
                            <>
                                <div className={styles.messageContainer}>
                                    <input
                                        type="text"
                                        placeholder="Añade un mensaje..."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className={styles.messageInput}
                                        maxLength={80}
                                        disabled={isSending}
                                    />
                                </div>
                                <button
                                    className={styles.sendBtn}
                                    onClick={handleSend}
                                    disabled={isSending}
                                >
                                    {isSending ? 'Enviando...' : 'Enviar 💌'}
                                </button>
                                <button
                                    className={styles.retakeBtn}
                                    onClick={handleRetake}
                                    disabled={isSending}
                                >
                                    Repetir foto
                                </button>
                            </>
                        )}
                    </div>
                </CameraPermissionGate>
            </div>
        </div>
    );
}
