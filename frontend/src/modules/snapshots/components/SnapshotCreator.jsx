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
    const [stream, setStream] = useState(null);
    const [isCameraLoading, setIsCameraLoading] = useState(true);
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

    /* ─── Real-time listener for OWN snapshots ─── */
    useEffect(() => {
        if (!user) return;

        // Query simpler to avoid missing composite index errors
        const q = query(
            collection(db, 'instantaneas'),
            where('createdBy', '==', user.uid),
            limit(15)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = Date.now();
            const snaps = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(snap => {
                    // Solo ver instantáneas que envié YO (esto es para el historial del botón de arriba)
                    // (isSeen se ignora en el historial para mostrar algo siempre)
                    const createdMs = snap.createdAt instanceof Timestamp
                        ? snap.createdAt.toMillis()
                        : (snap.createdAt?.seconds ? snap.createdAt.seconds * 1000 : 0);
                    return createdMs > 0 && (now - createdMs) <= TWENTY_FOUR_H_MS;
                })
                .sort((a, b) => {
                    const timeA = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
                    const timeB = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
                    return timeB - timeA; // Más recientes arriba
                });

            setOwnUnseenSnapshots(snaps);
            // Cada vez que el servidor se actualiza, refrescamos lo local por si ya subió
            refreshLocalHistory();
        });

        return () => unsubscribe();
    }, [user, refreshLocalHistory]);

    /* ─── Combine Remote + Local ─── */
    const allHistory = useMemo(() => {
        const local = localPending.map(item => ({
            id: item.id,
            photoUrl: URL.createObjectURL(item.photos[0].blob), // WARNING: We must manage revoking
            createdAt: item.createdAt,
            message: item.data?.message,
            isLocal: true
        }));

        // Combinar, evitar duplicados si ID coincide, y ordenar
        const combined = [...local, ...ownUnseenSnapshots];
        return combined.sort((a, b) => {
            const timeA = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || a.createdAt || 0;
            const timeB = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || b.createdAt || 0;
            return timeB - timeA;
        });
    }, [localPending, ownUnseenSnapshots]);

    /* ─── Camera lifecycle ─── */
    const stopCamera = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            setStream(null);
        }
    }, [stream]);

    const startCamera = useCallback(async (mode) => {
        setIsCameraLoading(true);
        
        // Parada limpia inmediata
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }

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
            
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.onloadedmetadata = () => {
                    setIsCameraLoading(false);
                    setStream(mediaStream);
                };
            }
            logToVercel('SnapshotCreator', 'CAMERA_STARTED', mode);
        } catch (err) {
            console.error('Camera fallback...', err);
            try {
                const fallbackStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: mode },
                    audio: false
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = fallbackStream;
                    setIsCameraLoading(false);
                    setStream(fallbackStream);
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
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(t => t.stop());
            }
        };
    }, [facingMode, startCamera]);

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
                await queueSnapshot(file, message.trim());
                logToVercel('SnapshotCreator', 'QUEUED', `size=${file.size}`);
                await refreshLocalHistory();
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

    const hasHistory = allHistory.length > 0;

    return (
        <div className={styles.overlay}>
            {/* ── Close ── */}
            <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
                ✕
            </button>

            {/* ── History toggle ── */}
            <div 
                ref={clockRef} 
                className={styles.clockBadge} 
                aria-label="Mis enviadas recientemente"
                style={{ cursor: hasHistory ? 'pointer' : 'default' }}
                onClick={() => hasHistory && onOpenOwnSnapshots?.(allHistory)}
            >
                {hasHistory ? (
                    <img src={allHistory[0].photoUrl} className={styles.clockThumb} alt="" />
                ) : (
                    <span className={styles.clockIcon}>
                        <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>history</span>
                    </span>
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
