import { useOfflineQueue } from '../../../hooks/useOfflineQueue';
import styles from './UploadQueueStatus.module.css';

/**
 * UploadQueueStatus — Floating badge showing pending offline uploads.
 * Displays count + processing indicator. Auto-hides when queue is empty.
 */
export default function UploadQueueStatus() {
    const { pendingCount, isProcessing } = useOfflineQueue();

    if (pendingCount === 0 && !isProcessing) return null;

    return (
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
                    ? `Subiendo...`
                    : `${pendingCount} pendiente${pendingCount > 1 ? 's' : ''}`
                }
            </span>
        </div>
    );
}
