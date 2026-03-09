import { useState, useEffect, useCallback, useRef } from 'react';
import { callBackendApi } from '../../../apiClient';
import { auth } from '../../../services/firebase';

/**
 * useGallery — Custom hook for paginated photo fetching.
 * Uses collectionGroup('photos') to get all photos across all memories.
 * Now also includes archived snapshots merged chronologically.
 */
export function useGallery(pageSize = 20) {
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);
    const lastDocRef = useRef(null);
    const isLoadingRef = useRef(false);

    const fetchPhotos = useCallback(async (isInitial = false) => {
        if (!auth.currentUser) {
            setLoading(false);
            isLoadingRef.current = false;
            return;
        }
        if (isLoadingRef.current || (!hasMore && !isInitial)) return;

        setLoading(true);
        isLoadingRef.current = true;
        setError(null);

        try {
            const result = await callBackendApi('getGallery', {
                limit: pageSize,
                // Pagination can be added here if needed in the future
            });

            if (result.success) {
                const fetchedPhotos = result.photos.map(p => ({
                    ...p,
                    // If backend sends ISO strings, we might need to verify format
                }));

                if (isInitial) {
                    setPhotos(fetchedPhotos);
                } else {
                    setPhotos(prev => [...prev, ...fetchedPhotos]);
                }

                // For now, simplicity: if we got less than pageSize, there's no more.
                setHasMore(fetchedPhotos.length === pageSize);
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            console.error('Error fetching gallery photos:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            isLoadingRef.current = false;
        }
    }, [pageSize]);

    // Initial fetch
    useEffect(() => {
        fetchPhotos(true);
    }, []);

    const loadMore = () => fetchPhotos(false);

    return { photos, loading, hasMore, error, loadMore };
}
