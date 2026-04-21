import { useEffect, useRef } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './useAuth';
import { COLLECTIONS } from '../config/constants';
import { downloadAndCachePhoto } from '../utils/photoCache';

/**
 * useSnapshotsSync — Hook global para descargar prioritariamente
 * instantáneas nuevas en cuanto se abre la aplicación.
 */
export function useSnapshotsSync() {
    const { relationshipId, user } = useAuth();
    const hasSyncedRef = useRef(false);

    useEffect(() => {
        if (!relationshipId || !user || hasSyncedRef.current) return;

        async function syncSnapshots() {
            try {
                console.log('[useSnapshotsSync] Starting high-priority snapshot sync...');
                
                const snapshotsRef = collection(db, 'relationships', relationshipId, COLLECTIONS.INSTANTANEAS);
                
                // Buscamos solo las que NO son mías y NO han sido vistas
                const q = query(
                    snapshotsRef,
                    where('createdBy', '!=', user.uid),
                    where('isSeen', '==', false),
                    limit(10) // Suficiente para una ráfaga inicial
                );

                const querySnapshot = await getDocs(q);
                
                if (querySnapshot.empty) {
                    console.log('[useSnapshotsSync] No pending snapshots to download.');
                    return;
                }

                // Descarga paralela de todas las snapshots pendientes
                const downloadPromises = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    const url = data.photoUrl || data.url;
                    if (url) {
                        return downloadAndCachePhoto(doc.id, url);
                    }
                    return Promise.resolve();
                });

                await Promise.allSettled(downloadPromises);
                console.log(`[useSnapshotsSync] Priority sync complete. ${querySnapshot.size} snapshots processed.`);
                hasSyncedRef.current = true;
            } catch (err) {
                console.warn('[useSnapshotsSync] Sync error:', err);
            }
        }

        syncSnapshots();
        
        // También nos suscribimos a cambios pero de forma ligera (opcional)
        // Por ahora con el pull inicial al montar es suficiente para la "experiencia de entrada"
    }, [relationshipId, user]);
}
