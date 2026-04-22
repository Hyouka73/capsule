import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../hooks/useAuth';
import { useSnapshots } from '../hooks/useSnapshots';
import { useOfflineQueue } from '../../../hooks/useOfflineQueue';
import { deleteSnapshot } from '../../../apiClient';
import { toast } from '../../../components/ui/PastelToast/PastelToast';
import Carousel from '../../../components/ui/Carousel/Carousel';
import ConfirmModal from '../../../components/ui/ConfirmModal/ConfirmModal';
import styles from './SnapshotHistory.module.css';

/**
 * SnapshotHistory — Galería de momentos con eliminaciones bajo confirmación custom.
 */
export default function SnapshotHistory({ onClose }) {
    const { sentSnapshots, loading } = useSnapshots();
    const { getPendingSnapshots, pendingCount } = useOfflineQueue();
    const [pendingSnapshots, setPendingSnapshots] = useState([]);
    const [snapshotToDelete, setSnapshotToDelete] = useState(null);

    // Load pending items from IndexedDB
    useEffect(() => {
        let isMounted = true;
        const loadPending = async () => {
            const items = await getPendingSnapshots();
            if (isMounted) {
                // Map to a format similar to Firestore snapshots for the Carousel
                const mapped = items.map(item => ({
                    id: item.id,
                    photoUrl: item.photos?.[0]?.blob ? URL.createObjectURL(item.photos[0].blob) : '',
                    message: item.data?.message || '',
                    createdAtMs: item.createdAt,
                    status: item.status, // 'pending' or 'uploading'
                    isPending: true
                }));
                setPendingSnapshots(mapped);
            }
        };
        loadPending();
        return () => {
            isMounted = false;
            // Cleanup object URLs to avoid memory leaks
            pendingSnapshots.forEach(s => {
                if (s.photoUrl.startsWith('blob:')) URL.revokeObjectURL(s.photoUrl);
            });
        };
    }, [getPendingSnapshots, pendingCount]);

    // Combined list: Pending first, then sent
    const allSnapshots = useMemo(() => {
        return [...pendingSnapshots, ...sentSnapshots];
    }, [pendingSnapshots, sentSnapshots]);

    const handleConfirmDelete = async () => {
        if (!snapshotToDelete) return;
        const snapId = snapshotToDelete.id;
        setSnapshotToDelete(null);

        try {
            const res = await deleteSnapshot({ snapshotId: snapId });
            if (res.success) {
                toast.success('Momento eliminado');
            }
        } catch (err) {
            toast.error('Error al eliminar');
        }
    };

    const renderSnapshotItem = (snap) => (
        <div className={styles.carouselItem}>
            <div className={styles.photoWrapper}>
                <img src={snap.photoUrl} alt="" className={styles.photo} />
                
                {snap.isPending ? (
                    <div className={styles.pendingOverlay}>
                        <div className={styles.syncSpinner} />
                        <span>Sincronizando...</span>
                    </div>
                ) : snap.isSeen && (
                    <div className={styles.seenBadge}>Visto ✓</div>
                )}
                
                {!snap.isPending && (
                    <button 
                        className={styles.deleteBtn}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSnapshotToDelete(snap);
                        }}
                        title="Eliminar"
                    >
                        ✕
                    </button>
                )}
            </div>
            
            <div className={styles.itemMeta}>
                <span className={styles.timeTag}>
                    {new Date(snap.createdAtMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {snap.message && (
                    <p className={styles.snapMsg}>{snap.message}</p>
                )}
            </div>
        </div>
    );

    return (
        <motion.div 
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className={styles.backdrop} onClick={onClose} />

            <div className={styles.container}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Momentos Enviados ✉️</h2>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                <div className={styles.content}>
                    {loading ? (
                        <div className={styles.loadingState}>
                            <p>Cargando tus momentos...</p>
                        </div>
                    ) : allSnapshots.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>✨</div>
                            <p>No tienes fotos activas ahora.</p>
                            <p className={styles.emptySub}>Las que envíes aparecerán aquí durante 24h.</p>
                        </div>
                    ) : (
                        <div className={styles.carouselWrapper}>
                            <Carousel 
                                items={allSnapshots}
                                renderItem={renderSnapshotItem}
                            />
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={!!snapshotToDelete}
                title="¿Eliminar momento?"
                message="Esta foto desaparecerá para ambos y no se puede recuperar. 🌪️"
                confirmText="Eliminar permanentemente"
                cancelText="Mantener foto"
                variant="danger"
                emoji="🗑️"
                onConfirm={handleConfirmDelete}
                onCancel={() => setSnapshotToDelete(null)}
            />
        </motion.div>
    );
}
