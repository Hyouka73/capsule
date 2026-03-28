import { useState, useEffect, useMemo } from 'react';
import { 
    collection, 
    query, 
    where, 
    onSnapshot, 
    orderBy, 
    limit,
    Timestamp 
} from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { COLLECTIONS } from '../../../config/constants';
import { markSnapshotAsSeen as markAsSeenApi } from '../../../apiClient';

const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000;

/**
 * useSnapshots — Hook de tiempo real para gestionar instantáneas.
 * 
 * Separa automáticamente entre:
 * - unseenSnapshots: Recibidas de la pareja y no vistas aún (dentro de 24h).
 * - sentHistory: Enviadas por mí (dentro de 24h o no vistas por la pareja).
 */
export function useSnapshots() {
    const { user, relationshipId } = useAuth();
    const [snapshots, setSnapshots] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !relationshipId) {
            setLoading(false);
            return;
        }

        // Referencia a la subcolección de la relación
        const snapshotsRef = collection(db, 'relationships', relationshipId, COLLECTIONS.INSTANTANEAS);
        
        // Consultar las últimas 50 instantáneas ordenadas por creación
        const q = query(
            snapshotsRef,
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = Date.now();
            const docs = snapshot.docs.map(doc => {
                const data = doc.data();
                const createdAtMs = data.createdAt?.toMillis?.() || data.createdAt?.seconds * 1000 || 0;
                return {
                    id: doc.id,
                    ...data,
                    createdAtMs,
                    createdAt: new Date(createdAtMs).toISOString()
                };
            });

            setSnapshots(docs);
            setLoading(false);
        }, (err) => {
            console.error('[useSnapshots] Error listening:', err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, relationshipId]);

    // Filtrar: Unseen (vienen de la pareja, no vistas, < 24h)
    const unseenSnapshots = useMemo(() => {
        const now = Date.now();
        return snapshots
            .filter(s => {
                // Debe ser de LA PAREJA (no mía)
                if (s.createdBy === user?.uid) return false;
                // No debe estar vista
                if (s.isSeen) return false;
                // No debe estar expirada (> 24h)
                if (now - s.createdAtMs > TWENTY_FOUR_H_MS) return false;
                return true;
            })
            .sort((a, b) => a.createdAtMs - b.createdAtMs); // De más vieja a más nueva para ver el mazo en orden
    }, [snapshots, user?.uid]);

    // Filtrar: Sent History (enviadas por mí, < 24h O no vistas por pareja)
    const sentSnapshots = useMemo(() => {
        const now = Date.now();
        return snapshots
            .filter(s => {
                // Debe ser MÍA
                if (s.createdBy !== user?.uid) return false;
                // Si la pareja ya la vio, fuera del historial
                if (s.isSeen) return false;
                // Solo mostrar si no han pasado 24h
                return (now - s.createdAtMs) < TWENTY_FOUR_H_MS;
            })
            .sort((a, b) => b.createdAtMs - a.createdAtMs); // Más reciente primero
    }, [snapshots, user?.uid]);

    const markAsSeen = async (snapshotId) => {
        try {
            await markAsSeenApi({ snapshotId });
        } catch (err) {
            console.error('[useSnapshots] Error marking as seen:', err);
        }
    };

    return {
        unseenSnapshots,
        sentSnapshots,
        allSnapshots: snapshots,
        loading,
        hasUnseen: unseenSnapshots.length > 0,
        markAsSeen
    };
}
