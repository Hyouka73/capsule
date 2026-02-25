import { motion } from 'framer-motion';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import styles from './SnapshotOverlay.module.css';

/**
 * SnapshotOverlay — Full screen view of a snapshot.
 * Marks it as seen when the user closes it.
 */
export default function SnapshotOverlay({ snapshot, onClose }) {

    const handleClose = async () => {
        try {
            const snapshotRef = doc(db, 'instantaneas', snapshot.id);
            await updateDoc(snapshotRef, {
                isSeen: true,
                seenAt: serverTimestamp()
            });
            onClose();
        } catch (err) {
            console.error('Error marking snapshot as seen:', err);
            onClose(); // Close anyway to not block user
        }
    };

    return (
        <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className={styles.content}>
                <motion.div
                    className={styles.card}
                    initial={{ scale: 0.8, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                >
                    <div className={styles.photoContainer}>
                        <img
                            src={snapshot.photoUrl}
                            alt="Snapshot"
                            className={styles.photo}
                        />
                    </div>

                    {snapshot.message && (
                        <div className={styles.messageRow}>
                            <p>{snapshot.message}</p>
                        </div>
                    )}

                    <footer className={styles.footer}>
                        <button className={styles.closeBtn} onClick={handleClose}>
                            Guardar recuerdo ✨
                        </button>
                    </footer>
                </motion.div>
            </div>
        </motion.div>
    );
}
