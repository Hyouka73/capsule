import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../hooks/useAuth';
import { getSnapshots, deleteSnapshot } from '../../../apiClient';
import { toast } from '../../../components/ui/PastelToast/PastelToast';
import styles from './SnapshotHistory.module.css';

/**
 * SnapshotHistory — A grid gallery for browsing snapshots.
 */
export default function SnapshotHistory({ initialSnapshots = [], onClose }) {
    const [snapshots, setSnapshots] = useState(initialSnapshots);
    const [selectedIdx, setSelectedIdx] = useState(null);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await getSnapshots();
            if (res.success) {
                setSnapshots(res.snapshots || []);
            }
        } catch (err) {
            toast.error('Error al cargar historial');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (snapshots.length === 0) {
            fetchHistory();
        }
    }, []);

    const handleDelete = async (e, snapId) => {
        e.stopPropagation();
        if (!isAdmin) return;
        if (!window.confirm('¿Eliminar esta instantánea permanentemente?')) return;

        try {
            const res = await deleteSnapshot({ snapshotId: snapId });
            if (res.success) {
                toast.success('Instantánea eliminada');
                setSnapshots(prev => prev.filter(s => s.id !== snapId));
            }
        } catch (err) {
            toast.error('Error', err.message);
        }
    };

    return (
        <motion.div 
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className={styles.header}>
                <h2 className={styles.title}>Mis Enviadas ✨</h2>
                <button className={styles.closeBtn} onClick={onClose}>✕</button>
            </div>

            <div className={styles.scrollArea}>
                {snapshots.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>✨</div>
                        <p>Aún no has enviado instantáneas hoy.</p>
                        <p className={styles.emptySub}>¡Captura un momento ahora!</p>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {snapshots.map((snap, idx) => (
                            <motion.div 
                                key={snap.id}
                                className={styles.gridItem}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedIdx(idx)}
                            >
                                <div className={styles.photoWrapper}>
                                    <img src={snap.photoUrl} alt="" className={styles.photo} loading="lazy" />
                                    {snap.message && <div className={styles.msgIndicator}>💌</div>}
                                    {snap.isLocal && <div className={styles.syncingIndicator}>⏳</div>}
                                    {isAdmin && (
                                        <button 
                                            className={styles.deleteBtn}
                                            onClick={(e) => handleDelete(e, snap.id)}
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                                <div className={styles.itemMeta}>
                                    {snap.createdAt instanceof Date ? snap.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
                                     snap.createdAt?.seconds ? new Date(snap.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
                                     typeof snap.createdAt === 'number' ? new Date(snap.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
                                     snap.createdAt && typeof snap.createdAt === 'string' ? new Date(snap.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Simple Lightbox for viewing one at a time from history */}
            <AnimatePresence>
                {selectedIdx !== null && (
                    <motion.div 
                        className={styles.lightbox}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={() => setSelectedIdx(null)}
                    >
                        <div className={styles.lightboxContent}>
                            <img src={snapshots[selectedIdx].photoUrl} alt="" className={styles.lightboxImg} />
                            {snapshots[selectedIdx].message && (
                                <div className={styles.lightboxMsg}>
                                    {snapshots[selectedIdx].message}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
