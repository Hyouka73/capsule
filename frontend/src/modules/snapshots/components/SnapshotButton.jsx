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
import SnapshotOverlay from './SnapshotOverlay';
import styles from './SnapshotButton.module.css';
import TulipIcon from '../../../components/ui/TulipIcon';

/**
 * SnapshotButton — Polished version with high-fidelity SVG and premium glass.
 */
export default function SnapshotButton() {
    const [latestSnapshot, setLatestSnapshot] = useState(null);
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);

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
        <>
            <button
                className={`${styles.instantaneasBtn} ${hasUnseen ? styles.hasNew : styles.discrete}`}
                onClick={() => {
                    if (hasUnseen) setIsOverlayOpen(true);
                }}
                disabled={!hasUnseen}
                title="Ver instantáneas"
            >
                <div className={styles.iconWrapper}>
                    <TulipIcon size={26} />
                </div>
            </button>

            {hasUnseen && isOverlayOpen && (
                <SnapshotOverlay
                    snapshot={latestSnapshot}
                    onClose={() => setIsOverlayOpen(false)}
                />
            )}
        </>
    );
}
