import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    collection, 
    query, 
    where, 
    onSnapshot, 
    orderBy, 
    limit, 
    Timestamp 
} from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { useOfflineQueue } from '../../../hooks/useOfflineQueue';
import { logToVercel } from '../../../utils/vercelLogger';
import CameraPermissionGate from '../../../components/ui/CameraPermissionGate/CameraPermissionGate';
import styles from './SnapshotCreator.module.css';

const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000;

export default function SnapshotCreator({ onClose, onOpenOwnSnapshots }) {
    const { user } = useAuth();
    const [isCameraLoading, setIsCameraLoading] = useState(true);
    const streamRef = useRef(null);
    const [facingMode, setFacingMode] = useState('environment');
    const [message, setMessage] = useState('');
    const [isMessageOpen, setIsMessageOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Thumbs for the "land" animation (local state)
    const [sentThumbs, setSentThumbs] = useState([]);
    
    // Remote "own" snapshots (actually in DB)
    const [ownUnseenSnapshots, setOwnUnseenSnapshots] = useState([]);

    const [flyThumb, setFlyThumb] = useState(null);
    const [isFlying, setIsFlying] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const shutterRef = useRef(null);
    const clockRef = useRef(null);

    const { queueSnapshot, getPendingSnapshots } = useOfflineQueue();
    const [localPending, setLocalPending] = useState([]);

    const refreshLocalHistory = useCallback(async () => {
        const pending = await getPendingSnapshots();
        setLocalPending(pending || []);
    }, [getPendingSnapshots]);

    useEffect(() => {
        refreshLocalHistory();
    }, [refreshLocalHistory]);

    // Removed Firestore listener for "own" snapshots to comply with "Eliminar Firestore directo"
    // and simplified UI requirements.
    
    /* ─── Camera lifecycle ─── */

    /* ─── Camera lifecycle ─── */
    const stopCamera = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        if (streamRef.current) {
            const tracks = streamRef.current.getTracks();
            tracks.forEach(t => t.stop());
            streamRef.current = null;
        }
    }, []);

    const startCamera = useCallback(async (mode) => {
        setIsCameraLoading(true);
        
        // Stop any existing stream first
        stopCamera();

        try {
            const constraints = {
                video: { 
                    facingMode: mode,
                    width: { ideal: 720 },
                    aspectRatio: 1
                },
                audio: false,
            };

            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = mediaStream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.onloadedmetadata = () => {
                    setIsCameraLoading(false);
                };
            }
            logToVercel('SnapshotCreator', 'CAMERA_STARTED', mode);
        } catch (err) {
            // Camera fallback...
            try {
                const fallbackStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: mode },
                    audio: false
                });
                streamRef.current = fallbackStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = fallbackStream;
                    setIsCameraLoading(false);
                }
            } catch (fallbackErr) {
                logToVercel('SnapshotCreator', 'CAMERA_ERROR', fallbackErr.message);
                setIsCameraLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        startCamera(facingMode);
        return () => {
            stopCamera();
        };
    }, [facingMode, startCamera, stopCamera]);

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

            setFlyThumb(thumbUrl);
            setIsFlying(true);

            setTimeout(() => {
                setIsFlying(false);
                setSentThumbs(prev => [{ id: Date.now(), url: thumbUrl }, ...prev].slice(0, 5));
                setTimeout(() => URL.revokeObjectURL(thumbUrl), 30_000);
            }, 600);

            setIsSending(true);
            try {
                const res = await queueSnapshot(file, message.trim());
                logToVercel('SnapshotCreator', 'QUEUED', `size=${file.size}`);
                // Refresh local immediately to show in history badge
                await refreshLocalHistory();
            } catch (err) {
                // Queue error
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

            {/* Hidden SVG clip path for camera squircle (outside content for stability) */}
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

            <div className={styles.content}>
                <CameraPermissionGate onCancel={onClose}>


                    {/* Hidden canvas */}
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    {/* Viewfinder — always the camera */}
                    <div className={`${styles.squircle} ${isSending ? styles.squircleSending : ''}`}>
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <video
                                ref={videoRef}
                                className={`${styles.video} ${facingMode === 'user' ? styles.videoMirrored : ''}`}
                                autoPlay
                                playsInline
                                muted
                            />
                            {isCameraLoading && (
                                <div className={styles.loader}>
                                    <p className={styles.loaderText}>Cargando lente...</p>
                                </div>
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

                        {/* Flip camera — ahora aquí, reemplaza el spacer */}
                        <button
                            className={styles.msgToggle}
                            onClick={toggleCamera}
                            disabled={isCameraLoading}
                            aria-label="Cambiar cámara"
                        >
                            <span className="material-symbols-outlined">flip_camera_ios</span>
                        </button>
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
