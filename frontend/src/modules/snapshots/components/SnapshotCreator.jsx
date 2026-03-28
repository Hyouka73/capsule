import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../hooks/useAuth';
import { useOfflineQueue } from '../../../hooks/useOfflineQueue';
import { compressImage } from '../../../services/storage';
import { logToVercel } from '../../../utils/vercelLogger';
import CameraPermissionGate from '../../../components/ui/CameraPermissionGate/CameraPermissionGate';
import styles from './SnapshotCreator.module.css';

// SQUIRCLE PATH — NO MODIFICAR
const squirclePath = "M0.5,0 C0.42,0 0,0.42 0,0.5 C0,0.58 0.42,1 0.5,1 C0.58,1 1,0.58 1,0.5 C1,0.42 0.58,0 0.5,0 Z";

export default function SnapshotCreator({ onClose, onOpenHistory }) {
    const { user } = useAuth();
    const [isCameraLoading, setIsCameraLoading] = useState(true);
    const streamRef = useRef(null);
    const [facingMode, setFacingMode] = useState('environment');
    const [message, setMessage] = useState('');
    const [isMessageOpen, setIsMessageOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const [flyThumb, setFlyThumb] = useState(null);
    const [isFlying, setIsFlying] = useState(false);
    const [showFlash, setShowFlash] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const shutterRef = useRef(null);

    const { queueSnapshot } = useOfflineQueue();

    /* ─── Camera lifecycle ─── */
    const stopCamera = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
    }, []);

    const startCamera = useCallback(async (mode) => {
        setIsCameraLoading(true);
        stopCamera();

        try {
            const constraints = {
                video: { 
                    facingMode: mode,
                    width: { ideal: 1024 },
                    aspectRatio: 1
                },
                audio: false,
            };

            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = mediaStream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                // Use onPlaying as it's more reliable for immediate capture
                videoRef.current.onplaying = () => {
                    setIsCameraLoading(false);
                };
            }
        } catch (err) {
            logToVercel('SnapshotCreator', 'CAMERA_ERROR', err.message);
            setIsCameraLoading(false);
        }
    }, [stopCamera]);

    useEffect(() => {
        startCamera(facingMode);
        return () => stopCamera();
    }, [facingMode, startCamera, stopCamera]);

    /* ─── Capture ─── */
    const handleCapture = async () => {
        if (!videoRef.current || !canvasRef.current || isSending || isCameraLoading) return;
        if (videoRef.current.videoWidth === 0) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const id = `snap_${Date.now()}`;
        
        try {
            // Convertimos canvas a blob antes de comprimir (compressImage requiere un Blob/File)
            const rawBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.95));
            if (!rawBlob) throw new Error('No se pudo generar el Blob del canvas');
            
            // Quality-First Optimization: WebP, 1080px, Floor 0.5
            const optimizedBlob = await compressImage(rawBlob, {
                maxWidth: 1080,
                initialQuality: 0.8,
                mimeType: 'image/webp',
                maxWeightKb: 500,
                minQuality: 0.5
            });

            const thumbUrl = URL.createObjectURL(optimizedBlob);
            const file = new File([optimizedBlob], `${id}.webp`, { type: 'image/webp' });

            setFlyThumb(thumbUrl);
            setIsFlying(true);
            setShowFlash(true);

            // Shutter feedback
            if (shutterRef.current) {
                shutterRef.current.style.transform = 'scale(0.8)';
                setTimeout(() => { if (shutterRef.current) shutterRef.current.style.transform = ''; }, 100);
            }
            // Flash duration
            setTimeout(() => setShowFlash(false), 150);

            // Fly animation ends
            setTimeout(() => {
                setIsFlying(false);
                setTimeout(() => URL.revokeObjectURL(thumbUrl), 1000);
            }, 550);

            setIsSending(true);
            try {
                await queueSnapshot(file, message.trim());
            } catch (err) {
                logToVercel('SnapshotCreator', 'QUEUE_ERROR', err.message);
            } finally {
                setIsSending(false);
                setMessage('');
                setIsMessageOpen(false);
            }
        } catch (err) {
            logToVercel('SnapshotCreator', 'CAPTURE_ERROR', err.message);
        }
    };

    const toggleCamera = () => setFacingMode(m => m === 'environment' ? 'user' : 'environment');

    return (
        <div className={styles.overlay}>
            <div className={styles.backdrop} onClick={onClose} />
            
            <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
                <span className="material-symbols-rounded">close</span>
            </button>
            <button className={styles.historyBtn} onClick={onOpenHistory} title="Ver historial">
                <span className="material-symbols-rounded">history</span>
            </button>

            <AnimatePresence>
                {isFlying && flyThumb && (
                    <motion.img
                        key="fly"
                        src={flyThumb}
                        className={styles.flyImg}
                        initial={{ scale: 1, x: '-50%', y: '-50%', opacity: 1, rotate: 0 }}
                        animate={{ scale: 0.05, x: '38vw', y: '-44vh', opacity: 0, rotate: 25 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                    />
                )}
            </AnimatePresence>

            <svg height="0" width="0" style={{ position: 'absolute' }}>
                <defs>
                    <clipPath clipPathUnits="objectBoundingBox" id="pillowClipCreator">
                        <path d={squirclePath} transform="rotate(45 0.5 0.5)" />
                    </clipPath>
                </defs>
            </svg>

            <div className={styles.content}>
                <CameraPermissionGate onCancel={onClose}>
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    <div className={`${styles.viewfinderContainer} ${isSending ? styles.sending : ''}`}>
                        <div className={styles.squircle}>
                            <video
                                ref={videoRef}
                                className={`${styles.video} ${facingMode === 'user' ? styles.videoMirrored : ''}`}
                                autoPlay
                                playsInline
                                muted
                            />
                            {isCameraLoading && (
                                <div className={styles.loader}>
                                    <span className={styles.loaderSpinner} />
                                    <p>Abriendo lente...</p>
                                </div>
                            )}

                            {message && (
                                <motion.div 
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className={styles.messagePreview}
                                >
                                    <span>{message}</span>
                                </motion.div>
                            )}

                            <AnimatePresence>
                                {showFlash && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className={styles.shutterFlash} 
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                        <div className={styles.viewfinderGlow} />
                    </div>

                    <div className={styles.footer}>
                        <div className={styles.controls}>
                            <button
                                className={styles.iconBtn}
                                onClick={toggleCamera}
                                disabled={isCameraLoading}
                                title="Girar cámara"
                            >
                                <motion.span 
                                    key={facingMode}
                                    initial={{ rotate: 0 }}
                                    animate={{ rotate: 180 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                    className="material-symbols-rounded"
                                >
                                    sync
                                </motion.span>
                            </button>

                            <button
                                ref={shutterRef}
                                className={styles.shutterBtn}
                                onClick={handleCapture}
                                disabled={isCameraLoading || isSending}
                            >
                                <div className={styles.shutterInner} />
                            </button>

                            <button
                                className={styles.iconBtn}
                                onClick={() => setIsMessageOpen(o => !o)}
                                title="Añadir mensaje"
                            >
                                <span className="material-symbols-rounded">
                                    {isMessageOpen ? 'close' : 'chat'}
                                </span>
                            </button>
                        </div>

                        <AnimatePresence>
                            {isMessageOpen && (
                                <motion.div
                                    className={styles.messageRow}
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                >
                                    <input
                                        type="text"
                                        placeholder="Escribe algo tierno... 💌"
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        className={styles.messageInput}
                                        maxLength={50}
                                        autoFocus
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </CameraPermissionGate>
            </div>
        </div>
    );
}
