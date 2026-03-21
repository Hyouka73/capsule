import { motion, AnimatePresence } from 'framer-motion';
import { useOfflineQueue } from '../../../hooks/useOfflineQueue';
import styles from './UploadQueueStatus.module.css';

/**
 * UploadQueueStatus — Floating badge showing pending and failed uploads.
 * Redesigned with Clay Chunky aesthetics.
 */
export default function UploadQueueStatus() {
    const { 
        pendingCount, 
        failedCount, 
        isProcessing, 
        retryFailedItems, 
        clearFailedItems 
    } = useOfflineQueue();

    const hasItems = pendingCount > 0 || failedCount > 0 || isProcessing;
    if (!hasItems) return null;

    return (
        <AnimatePresence>
            <motion.div 
                className={styles.root}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
            >
                {/* Pending / Processing State */}
                {(pendingCount > 0 || isProcessing) && (
                    <div className={styles.badge}>
                        <span className={styles.icon}>
                            {isProcessing ? (
                                <span className={styles.spinner}>⏳</span>
                            ) : (
                                '📤'
                            )}
                        </span>
                        <span className={styles.text}>
                            {isProcessing
                                ? `Sincronizando...`
                                : `${pendingCount} pendiente${pendingCount > 1 ? 's' : ''}`
                            }
                        </span>
                    </div>
                )}

                {/* Failed State */}
                {failedCount > 0 && (
                    <div className={`${styles.badge} ${styles.failed}`}>
                        <span className={styles.icon}>⚠️</span>
                        <div className={styles.failedContent}>
                            <span className={styles.text}>
                                {failedCount} falló permanentemente
                            </span>
                            <div className={styles.actions}>
                                <button 
                                    onClick={retryFailedItems}
                                    className={styles.retryBtn}
                                    title="Reintentar todo"
                                >
                                    🔄 Reintentar
                                </button>
                                <button 
                                    onClick={clearFailedItems}
                                    className={styles.clearBtn}
                                    title="Limpiar fallidos"
                                >
                                    🗑️ Limpiar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
