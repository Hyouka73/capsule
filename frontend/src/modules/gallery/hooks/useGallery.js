import { useState, useEffect, useCallback, useRef } from 'react';
import { callBackendApi } from '../../../apiClient';
import { auth } from '../../../services/firebase';

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

        try {
            const params = { limit: pageSize };

            if (!isInitial && lastDocRef.current) {
                params.lastCreatedAt = lastDocRef.current.createdAt;
                params.lastId = lastDocRef.current.id;
            }

            const result = await callBackendApi('getGallery', params);

            if (result.success) {
                const fetchedPhotos = result.photos || [];

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
