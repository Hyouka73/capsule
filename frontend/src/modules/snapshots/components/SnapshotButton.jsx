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
import { useAuth } from '../../../hooks/useAuth';
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
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        // Quitamos el orderBy de la consulta de Firestore para evitar errores de índices compuestos
        // Ordenaremos manualmente en memoria.
        const q = query(
            collection(db, 'instantaneas'),
            where('isSeen', '==', false),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = Date.now();
            const snaps = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(snap => {
                    // Filter out own snapshots
                    if (snap.createdBy === user.uid) return false;

                    const createdMs = snap.createdAt instanceof Timestamp
                        ? snap.createdAt.toMillis()
                        : (snap.createdAt?.seconds ? snap.createdAt.seconds * 1000 : 0);
                    return createdMs > 0 && (now - createdMs) <= TWENTY_FOUR_H_MS;
                })
                .sort((a, b) => {
                    const timeA = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
                    const timeB = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
                    return timeA - timeB; 
                });

            // Pre-cache photos for instant viewing
            snaps.forEach(s => {
                if (s.photoUrl) {
                    const img = new Image();
                    img.src = s.photoUrl;
                }
            });

            setUnseenSnapshots(snaps);
        });

        return () => unsubscribe();
    }, [user]);

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
            title={hasUnseen ? `${unseenSnapshots.length} nuevas instantáneas de tu pareja ✨` : 'Enviar instantánea'}
        >
            <div className={styles.iconWrapper}>
                <TulipIcon size={30} color={hasUnseen ? 'white' : undefined} />
                {/* Badge retirado por petición del usuario */}
            </div>
            {hasUnseen && <div className={styles.glowContainer} />}
        </button>
    );
}
