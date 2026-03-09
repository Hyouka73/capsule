import React, { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
    limit
} from 'firebase/firestore';
import { db } from '../../../services/firebase';
import styles from './SnapshotButton.module.css';
import TulipIcon from '../../../components/ui/TulipIcon';

/**
 * SnapshotButton — Queries ALL unseen snapshots (up to 10) and shows badge count.
 * Delegates overlay rendering to parent via callbacks.
 */
export default function SnapshotButton({ onOpenSnapshot, onOpenCamera }) {
    const [unseenSnapshots, setUnseenSnapshots] = useState([]);

    useEffect(() => {
        const q = query(
            collection(db, 'instantaneas'),
            where('isSeen', '==', false),
            orderBy('createdAt', 'asc'),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const snaps = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setUnseenSnapshots(snaps);
            } else {
                setUnseenSnapshots([]);
            }
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
            title="Instantáneas"
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
