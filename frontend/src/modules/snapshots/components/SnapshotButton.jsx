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
 * SnapshotButton — Polished version with high-fidelity SVG and premium glass.
 * Delegates overlay rendering to parent via callbacks.
 */
export default function SnapshotButton({ onOpenSnapshot, onOpenCamera }) {
    const [latestSnapshot, setLatestSnapshot] = useState(null);

    useEffect(() => {
        const q = query(
            collection(db, 'instantaneas'),
            where('isSeen', '==', false),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                setLatestSnapshot({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
            } else {
                setLatestSnapshot(null);
            }
        });

        return () => unsubscribe();
    }, []);

    const hasUnseen = !!latestSnapshot;

    return (
        <button
            className={`${styles.instantaneasBtn} ${hasUnseen ? styles.hasNew : styles.discrete}`}
            onClick={() => {
                if (hasUnseen) {
                    onOpenSnapshot(latestSnapshot);
                } else {
                    onOpenCamera();
                }
            }}
            title="Instantáneas"
        >
            <div className={styles.iconWrapper}>
                <TulipIcon size={26} />
            </div>
        </button>
    );
}
