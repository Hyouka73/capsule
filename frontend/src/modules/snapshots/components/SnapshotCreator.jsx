import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOfflineQueue } from '../../../hooks/useOfflineQueue';
import { logToVercel } from '../../../utils/vercelLogger';
import CameraPermissionGate from '../../../components/ui/CameraPermissionGate/CameraPermissionGate';
import styles from './SnapshotCreator.module.css';

/**
 * SnapshotCreator — Instagram-style camera.
 *
 * Flow:
 *   1. Camera viewfinder is always open.
 *   2. Tap shutter → photo captured immediately, queued for upload.
 *   3. A tiny thumbnail animates from the viewfinder to the corner clock badge.
 *   4. No preview/retake screen — keep shooting or close with ✕.
 *   5. Corner badge shows the last N sent photos (not yet seen by partner).
 */
export default function SnapshotCreator({ onClose }) {
    const [stream, setStream] = useState(null);
    const [isCameraLoading, setIsCameraLoading] = useState(true);
    const [facingMode, setFacingMode] = useState('environment');
    const [message, setMessage] = useState('');
    const [isMessageOpen, setIsMessageOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Sent thumbnails: { id, url }[] — shown in corner clock badge
    const [sentThumbs, setSentThumbs] = useState([]);
    // The URL of the most-recently-sent photo (for the "fly" animation)
    const [flyThumb, setFlyThumb] = useState(null);
    const [isFlying, setIsFlying] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const shutterRef = useRef(null);
    const clockRef = useRef(null);

    const { queueSnapshot } = useOfflineQueue();

    /* ─── Camera lifecycle ─── */
    const startCamera = useCallback(async (mode) => {
        setIsCameraLoading(true);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: mode, width: { ideal: 1080 }, height: { ideal: 1080 } },
                audio: false,
            });
            setStream(mediaStream);
            if (videoRef.current) videoRef.current.srcObject = mediaStream;
            setIsCameraLoading(false);
            logToVercel('SnapshotCreator', 'CAMERA_STARTED', mode);
        } catch (err) {
            console.error('Camera error:', err);
            logToVercel('SnapshotCreator', 'CAMERA_ERROR', err.message);
            setIsCameraLoading(false);
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            setStream(null);
        }
    }, [stream]);

    useEffect(() => {
        startCamera(facingMode);
        return stopCamera;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [facingMode]);

    /* ─── Capture + instant send ─── */
    const handleCapture = async () => {
        if (!videoRef.current || !canvasRef.current || isSending) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
            if (!blob) return;

            const thumbUrl = URL.createObjectURL(blob);
            const file = new File([blob], `snapshot_${Date.now()}.jpg`, { type: 'image/jpeg' });

            // Start fly animation
            setFlyThumb(thumbUrl);
            setIsFlying(true);

            // After animation lands → add to corner thumbs
            setTimeout(() => {
                setIsFlying(false);
                setSentThumbs(prev => [{ id: Date.now(), url: thumbUrl }, ...prev].slice(0, 5));
                // Revoke after a bit (keep URL alive while shown)
                setTimeout(() => URL.revokeObjectURL(thumbUrl), 30_000);
            }, 600);

            // Queue upload in parallel
            setIsSending(true);
            try {
                await queueSnapshot(file, message.trim());
                logToVercel('SnapshotCreator', 'QUEUED', `size=${file.size}`);
            } catch (err) {
                console.error('Queue error:', err);
                logToVercel('SnapshotCreator', 'QUEUE_ERROR', err.message);
            } finally {
                setIsSending(false);
                setMessage('');
                setIsMessageOpen(false);
            }
        }, 'image/jpeg', 0.85);
    };

    const toggleCamera = () => setFacingMode(m => m === 'environment' ? 'user' : 'environment');

    return (
        <div className={styles.overlay}>
            {/* ── Close ── */}
            <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
                ✕
            </button>

            {/* ── Hidden clock badge (target of fly animation) ── */}
            <div ref={clockRef} className={styles.clockBadge} aria-label="Enviadas recientemente">
                {sentThumbs.length > 0 ? (
                    <>
                        <img src={sentThumbs[0].url} className={styles.clockThumb} alt="" />
                        {sentThumbs.length > 1 && (
                            <span className={styles.clockCount}>{sentThumbs.length}</span>
                        )}
                    </>
                ) : (
                    <span className={styles.clockIcon}>🕐</span>
                )}
            </div>

            {/* ── Flying thumbnail animation ── */}
            <AnimatePresence>
                {isFlying && flyThumb && (
                    <motion.img
                        key="fly"
                        src={flyThumb}
                        className={styles.flyImg}
                        initial={{ scale: 1, x: 0, y: 0, opacity: 1, borderRadius: '24px' }}
                        animate={{ scale: 0.18, x: 140, y: -320, opacity: 0.8, borderRadius: '50%' }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                    />
                )}
            </AnimatePresence>

            <div className={styles.content}>
                <CameraPermissionGate onCancel={onClose}>
                    {/* Pillow clip definition */}
                    <svg height="0" width="0" style={{ position: 'absolute' }}>
                        <defs>
                            <clipPath clipPathUnits="objectBoundingBox" id="pillowClipCreator">
                                <path
                                    d="M0.5,0 C0.42,0 0,0.42 0,0.5 C0,0.58 0.42,1 0.5,1 C0.58,1 1,0.58 1,0.5 C1,0.42 0.58,0 0.5,0 Z"
                                    transform="rotate(45 0.5 0.5)"
                                />
                            </clipPath>
                        </defs>
                    </svg>

                    {/* Hidden canvas */}
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    {/* Viewfinder — always the camera */}
                    <div className={`${styles.squircle} ${isSending ? styles.squircleSending : ''}`}>
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <video
                                ref={videoRef}
                                className={styles.video}
                                autoPlay
                                playsInline
                                muted
                            />
                            {isCameraLoading && (
                                <div className={styles.loader}>
                                    <p className={styles.loaderText}>Cargando lente...</p>
                                </div>
                            )}
                            {/* Flip camera button */}
                            {!isCameraLoading && (
                                <button
                                    className={styles.flipBtn}
                                    onClick={toggleCamera}
                                    aria-label="Cambiar cámara"
                                >
                                    <span className="material-symbols-outlined">flip_camera_ios</span>
                                </button>
                            )}
                            {/* Optional message chip inside viewfinder */}
                            {message && (
                                <div className={styles.messageChip}>
                                    <span>{message}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Controls row ── */}
                    <div className={styles.controls}>
                        {/* Add message toggle */}
                        <button
                            className={styles.msgToggle}
                            onClick={() => setIsMessageOpen(o => !o)}
                            aria-label="Añadir mensaje"
                        >
                            <span className="material-symbols-outlined">
                                {isMessageOpen ? 'keyboard_hide' : 'edit_note'}
                            </span>
                        </button>

                        {/* Shutter */}
                        <button
                            ref={shutterRef}
                            className={styles.shutterBtn}
                            onClick={handleCapture}
                            disabled={isCameraLoading || isSending}
                            aria-label="Tomar foto"
                        >
                            <div className={styles.shutterInner} />
                        </button>

                        {/* Spacer (mirrors msgToggle) */}
                        <div style={{ width: 44 }} />
                    </div>

                    {/* ── Optional message input ── */}
                    <AnimatePresence>
                        {isMessageOpen && (
                            <motion.div
                                className={styles.messageRow}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <input
                                    type="text"
                                    placeholder="Añade un mensaje... 💌"
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    className={styles.messageInput}
                                    maxLength={80}
                                    autoFocus
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CameraPermissionGate>
            </div>
        </div>
    );
}
