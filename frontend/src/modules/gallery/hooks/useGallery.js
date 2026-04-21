import { useState, useEffect, useCallback, useRef } from 'react';
import { callBackendApi } from '../../../apiClient';
import { auth } from '../../../services/firebase';
import { saveMemoriesToCache, getAllCachedMemories } from '../../../utils/memoryPersistence';
import { useAuth } from '../../../hooks/useAuth';

/**
 * useGallery — Custom hook for paginated photo fetching.
 * Uses collectionGroup('photos') to get all photos across all memories.
 * Now also includes archived snapshots merged chronologically.
 */
export function useGallery(pageSize = 24) {
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);
    const lastDocRef = useRef(null);
    const isLoadingRef = useRef(false);
    const initializedRef = useRef(false);

    const fetchPhotos = useCallback(async (isInitial = false) => {
        if (!auth.currentUser) {
            setLoading(false);
            return;
        }
        
        if (isLoadingRef.current) return;
        
        // Use a local hasMore check to avoid it being a callback dependency
        if (!isInitial && !lastDocRef.current) return;

        setLoading(true);
        isLoadingRef.current = true;
        setError(null);

        // --- OFFLINE FALLBACK ---
        if (!navigator.onLine) {
            try {
                const rid = localStorage.getItem('capsule_relationship_id'); 
                const cached = await getAllCachedMemories(rid);
                if (cached.length > 0) {
                    setPhotos(cached.map(m => ({ ...m, _type: 'memory', url: m.mainPhotoUrl })));
                } else {
                    setError('Modo offline: No hay recuerdos guardados.');
                }
            } catch (err) {
                setError('Error al cargar caché offline');
            } finally {
                setLoading(false);
                isLoadingRef.current = false;
                setHasMore(false);
            }
            return;
        }

        try {
            const params = { limit: pageSize };

            if (!isInitial && lastDocRef.current) {
                params.lastCreatedAt = lastDocRef.current.createdAt;
                params.lastId = lastDocRef.current.id;
            }

            const result = await callBackendApi('getGallery', params);

            if (result.success) {
                const fetchedPhotos = result.photos || [];

                // Persistence: Cache memories for offline access
                const ridgeId = auth.currentUser?.uid; 
                // Note: Better to get relationshipId from context, but useAuth is available
                // We'll use result.relationshipId if the backend provides it or just trust the hook context
                const memoriesToCache = fetchedPhotos.filter(p => p._type === 'memory');
                if (memoriesToCache.length > 0) {
                    // Try to get rid from the provided relationshipId if possible, but useAuth is safer
                    saveMemoriesToCache(memoriesToCache, result.relationshipId || 'current');
                }

                if (isInitial) {
                    setPhotos(fetchedPhotos);
                } else {
                    setPhotos(prev => [...prev, ...fetchedPhotos]);
                }

                if (fetchedPhotos.length > 0) {
                    lastDocRef.current = fetchedPhotos[fetchedPhotos.length - 1];
                }

                setHasMore(fetchedPhotos.length === pageSize && fetchedPhotos.length > 0);
            } else {
                setHasMore(false);
                throw new Error(result.error || 'Failed to fetch gallery');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            isLoadingRef.current = false;
        }
    }, [pageSize]); // Removed hasMore dependency to break the loop

    // React to Auth state once per user session
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user && !initializedRef.current) {
                initializedRef.current = true; // Guard against re-triggering initial load
                fetchPhotos(true);
            } else if (!user) {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [fetchPhotos]);

    const loadMore = () => fetchPhotos(false);

    return { photos, loading, hasMore, error, loadMore };
}
