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
            const currentPageSize = pageSize;
            const params = { limit: currentPageSize };

            // Apply cursor if not initial fetch
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

                // Update cursor with the last element
                if (fetchedPhotos.length > 0) {
                    lastDocRef.current = fetchedPhotos[fetchedPhotos.length - 1];
                }

                // If we got less than limit, we've reached the end
                setHasMore(fetchedPhotos.length === currentPageSize);
            } else {
                throw new Error(result.error || 'Failed to fetch gallery');
            }
        } catch (err) {
            // silent fail
            setError(err.message);
        } finally {
            setLoading(false);
            isLoadingRef.current = false;
        }
    }, [pageSize, hasMore]);

    // Initial fetch
    useEffect(() => {
        fetchPhotos(true);
    }, []);

    const loadMore = () => fetchPhotos(false);

    return { photos, loading, hasMore, error, loadMore };
}
