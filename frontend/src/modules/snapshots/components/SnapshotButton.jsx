import { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { getSnapshots } from '../../../apiClient';
import styles from './SnapshotButton.module.css';
import TulipIcon from '../../../components/ui/TulipIcon';

/** 24 hours in milliseconds */
const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000;

/**
 * SnapshotButton — Main entry point for Snapshots.
 * Admin sees [+] and the count badge. Partner sees only the count badge.
 *
 * @param {Function} onOpenSnapshot  Called when tapping badge to view unseen
 * @param {Function} onOpenCamera    Called by Admin (+) to shoot new
 * @param {Function} onOpenHistory   Called when tapping main button with no unseen
 */
export default function SnapshotButton({ onOpenSnapshot, onOpenCamera, onOpenHistory }) {
    const [unseenSnapshots, setUnseenSnapshots] = useState([]);
    const { user, relationshipId } = useAuth();
    const isAdmin = user?.role === 'admin';

    const fetchSnapshots = async () => {
        if (!user || !relationshipId) return;
        try {
            const res = await getSnapshots();
            if (res.success && res.snapshots) {
                const now = Date.now();
                const unseen = res.snapshots
                    .filter(snap => {
                        // Unseen snapshots from the OTHER person
                        if (snap.isSeen || snap.createdBy === user.uid) return false;
                        
                        const createdMs = snap.createdAt ? new Date(snap.createdAt).getTime() : 0;
                        return createdMs > 0 && (now - createdMs) <= TWENTY_FOUR_H_MS;
                    })
                    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                
                // Pre-cache
                unseen.forEach(s => {
                    if (s.photoUrl) {
                        const img = new Image();
                        img.src = s.photoUrl;
                    }
                });
                
                setUnseenSnapshots(unseen);
            }
        } catch (err) {
            // silent fail
        }
    };

    useEffect(() => {
        fetchSnapshots();
        // Polling every 30 seconds as fallback for real-time
        const interval = setInterval(fetchSnapshots, 30000);
        return () => clearInterval(interval);
    }, [user, relationshipId]);

    const hasUnseen = unseenSnapshots.length > 0;

    return (
        <div className={styles.container}>
            {/* View Unseen or History Button */}
            <button
                className={`${styles.instantaneasBtn} ${hasUnseen ? styles.hasNew : styles.discrete}`}
                onClick={() => {
                    if (hasUnseen) {
                        onOpenSnapshot(unseenSnapshots);
                    } else {
                        onOpenHistory();
                    }
                }}
                title={hasUnseen ? `${unseenSnapshots.length} nuevas instantáneas ✨` : 'Ver historial de instantáneas'}
            >
                <div className={styles.iconWrapper}>
                    <TulipIcon size={26} color={hasUnseen ? 'white' : undefined} />
                </div>
                {hasUnseen && <div className={styles.badge}>{unseenSnapshots.length}</div>}
                {hasUnseen && <div className={styles.glowContainer} />}
            </button>

            {/* Create Button (Admin Only) */}
            {isAdmin && (
                <button
                    className={styles.createBtn}
                    onClick={onOpenCamera}
                    title="Nueva Instantánea 📸"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
                        add_a_photo
                    </span>
                </button>
            )}
        </div>
    );
}
