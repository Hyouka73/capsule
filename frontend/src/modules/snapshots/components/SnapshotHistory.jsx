import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './SnapshotHistory.module.css';

/**
 * SnapshotHistory — A grid gallery for browsing snapshots.
 * Used for "Mis enviadas" (captured snapshots).
 * 
 * @param {Array}    snapshots - List of snapshots to display
 * @param {Function} onClose   - Callback to close the gallery
 */
export default function SnapshotHistory({ snapshots = [], onClose }) {
    const [selectedIdx, setSelectedIdx] = useState(null);

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
