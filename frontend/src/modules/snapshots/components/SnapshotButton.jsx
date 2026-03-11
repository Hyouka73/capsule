import { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
    limit,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../../../services/firebase';
import styles from './SnapshotButton.module.css';
import TulipIcon from '../../../components/ui/TulipIcon';

/** 24 hours in milliseconds */
const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000;

/**
 * SnapshotButton — Listens for unseen snapshots sent within the last 24 h.
 *
 * - Badge shows count of those snapshots.
 * - Clicking when there are unseen → opens SnapshotOverlay.
 * - Clicking when none → opens camera to shoot a new snapshot.
 *
 * @param {Function} onOpenSnapshot  Called with Array<snapshot> when tapping badge
 * @param {Function} onOpenCamera    Called when no unseen snapshots (shoot new one)
 */
export default function SnapshotButton({ onOpenSnapshot, onOpenCamera }) {
    const [unseenSnapshots, setUnseenSnapshots] = useState([]);

    useEffect(() => {
        // We query isSeen == false and 24-h filter client-side
        // (Firestore composite index would be needed for server-side date range + isSeen)
        const q = query(
            collection(db, 'instantaneas'),
            where('isSeen', '==', false),
            orderBy('createdAt', 'asc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = Date.now();
            const snaps = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(snap => {
                    // Keep only snapshots created within the last 24 h
                    const createdMs = snap.createdAt instanceof Timestamp
                        ? snap.createdAt.toMillis()
                        : (snap.createdAt?.seconds ? snap.createdAt.seconds * 1000 : 0);
                    return createdMs > 0 && (now - createdMs) <= TWENTY_FOUR_H_MS;
                });
            setUnseenSnapshots(snaps);
        });

        return () => unsubscribe();
    }, []);

    const hasUnseen = unseenSnapshots.length > 0;

    return (
        <button
            className={`${styles.instantaneasBtn} ${hasUnseen ? styles.hasNew : styles.discrete}`}
            onClick={() => {
                if (hasUnseen) {
                    onOpenSnapshot(unseenSnapshots);
                } else {
                    onOpenCamera();
                }
            }}
            title={hasUnseen ? `${unseenSnapshots.length} instantánea${unseenSnapshots.length > 1 ? 's' : ''} nueva${unseenSnapshots.length > 1 ? 's' : ''}` : 'Enviar instantánea'}
        >
            <div className={styles.iconWrapper}>
                <TulipIcon size={26} />
                {hasUnseen && (
                    <span className={styles.badgeCount}>
                        {unseenSnapshots.length}
                    </span>
                )}
            </div>
            {hasUnseen && <div className={styles.glowContainer} />}
        </button>
    );
}
