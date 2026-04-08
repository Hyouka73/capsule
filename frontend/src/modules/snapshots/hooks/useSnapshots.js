import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { openDB } from '../../../config/dbConfig';

const SEEN_STORE = 'seen_snapshots';
const SNAPSHOT_CACHE_NAME = 'snapshot-images-cache';

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
    const [optimisticSeenIds, setOptimisticSeenIds] = useState(new Set());
    const [availableIds, setAvailableIds] = useState(new Set());

    // 1. Cargar IDs vistos localmente (IndexedDB) al montar
    useEffect(() => {
        async function loadLocalSeen() {
            try {
                const dbInstance = await openDB();
                const tx = dbInstance.transaction(SEEN_STORE, 'readonly');
                const store = tx.objectStore(SEEN_STORE);
                const all = await new Promise((resolve) => {
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result || []);
                    req.onerror = () => resolve([]);
                });
                if (all.length > 0) {
                    setOptimisticSeenIds(new Set(all.map(item => item.id)));
                }
            } catch (err) {
                console.warn('[useSnapshots] Error loading seen cache:', err);
            }
        }
        loadLocalSeen();
    }, []);

    /**
     * prefetchImage — Carga una imagen en la Cache API y marca su ID como "disponible".
     */
    const prefetchImage = useCallback(async (url, id) => {
        if (!url || !id) return;
        try {
            const cache = await caches.open(SNAPSHOT_CACHE_NAME);
            const cachedResponse = await cache.match(url);
            
            if (!cachedResponse) {
                // Descargar y guardar en caché
                const response = await fetch(url);
                if (response.ok) {
                    await cache.put(url, response);
                }
            }
            
            // Actualización Inmediata: Marcar como disponible en cuanto se guarda en caché
            setAvailableIds(prev => new Set(prev).add(id));
        } catch (err) {
            console.warn(`[useSnapshots] Prefetch failed for ${id}:`, err);
        }
    }, []);

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

    // 2. Parallel Pre-fetch: Download images in background and mark as available
    useEffect(() => {
        const potentialSnapshots = snapshots.filter(s => 
            s.createdBy !== user?.uid && 
            s.photoUrl && 
            !s.isSeen && 
            !optimisticSeenIds.has(s.id) &&
            !availableIds.has(s.id)
        );

        if (potentialSnapshots.length === 0) return;

        // Parallel processing of all new images
        Promise.allSettled(potentialSnapshots.map(s => prefetchImage(s.photoUrl, s.id)));
    }, [snapshots, user?.uid, optimisticSeenIds, availableIds.size, prefetchImage]);

    // 2. Background Sync: Limpiar IndexedDB cuando Firestore ya refleja "Visto"
    useEffect(() => {
        if (snapshots.length === 0 || optimisticSeenIds.size === 0) return;

        async function cleanupSeenStore() {
            const dbInstance = await openDB();
            const tx = dbInstance.transaction(SEEN_STORE, 'readwrite');
            const store = tx.objectStore(SEEN_STORE);

            // Si un ID está en optimisticSeenIds pero Firestore ya dice que s.isSeen === true, fuera del store local.
            snapshots.forEach(s => {
                if (s.isSeen && optimisticSeenIds.has(s.id)) {
                    store.delete(s.id);
                    setOptimisticSeenIds(prev => {
                        const next = new Set(prev);
                        next.delete(s.id);
                        return next;
                    });
                }
            });
        }
        cleanupSeenStore();
    }, [snapshots]);

    // Filtrar: Unseen (vienen de la pareja, no vistas, < 24h)
    const unseenSnapshots = useMemo(() => {
        const now = Date.now();
        return snapshots
            .filter(s => {
                // Debe ser de LA PAREJA (no mía)
                if (s.createdBy === user?.uid) return false;
                // No debe estar vista (Firestore O Local)
                if (s.isSeen || optimisticSeenIds.has(s.id)) return false;
                // No debe estar expirada (> 24h)
                if (now - s.createdAtMs > TWENTY_FOUR_H_MS) return false;
                // EXCLUSIVO: Solo mostrar si ya está en caché local (disponible)
                if (!availableIds.has(s.id)) return false;
                return true;
            })
            .sort((a, b) => a.createdAtMs - b.createdAtMs);
    }, [snapshots, user?.uid, optimisticSeenIds]);

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

    const markAsSeen = useCallback(async (snapshotId) => {
        // 1. Actualizar estado local y persistir (Optimistic UI)
        setOptimisticSeenIds(prev => new Set([...prev, snapshotId]));
        
        try {
            const dbInstance = await openDB();
            const tx = dbInstance.transaction(SEEN_STORE, 'readwrite');
            tx.objectStore(SEEN_STORE).put({ id: snapshotId, timestamp: Date.now() });
        } catch (err) {
            console.warn('[useSnapshots] Error persisting seen status:', err);
        }

        // 2. Disparar API en background (sin await para no bloquear la UI)
        markAsSeenApi({ snapshotId }).catch(err => {
            console.error('[useSnapshots] Background sync failed:', err);
        });
    }, [relationshipId]);

    return {
        unseenSnapshots,
        sentSnapshots,
        allSnapshots: snapshots,
        loading,
        hasUnseen: unseenSnapshots.length > 0,
        markAsSeen
    };
}
