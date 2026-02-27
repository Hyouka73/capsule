import { useState, useEffect, useCallback, useRef } from 'react';
import {
    collectionGroup,
    query,
    orderBy,
    limit,
    startAfter,
    getDocs,
    where
} from 'firebase/firestore';
import { db, auth } from '../../../services/firebase';

/**
 * useGallery — Custom hook for paginated photo fetching
 * Uses collectionGroup('photos') to get all photos across all memories.
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
            let q;
            const photosCol = collectionGroup(db, 'photos');

            if (isInitial) {
                q = query(
                    photosCol,
                    where('isSnapshot', '!=', true),
                    orderBy('isSnapshot', 'asc'),
                    orderBy('createdAt', 'desc'),
                    limit(pageSize)
                );
            } else if (lastDocRef.current) {
                q = query(
                    photosCol,
                    where('isSnapshot', '!=', true),
                    orderBy('isSnapshot', 'asc'),
                    orderBy('createdAt', 'desc'),
                    startAfter(lastDocRef.current),
                    limit(pageSize)
                );
            }

            if (!q) {
                setLoading(false);
                isLoadingRef.current = false;
                return;
            }

            const snapshot = await getDocs(q);

            const newPhotos = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Store parent reference path if needed for context
                parentPath: doc.ref.parent.parent?.path
            }));

            if (isInitial) {
                setPhotos(newPhotos);
            } else {
                setPhotos(prev => [...prev, ...newPhotos]);
            }

            lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
            setHasMore(snapshot.docs.length === pageSize);
        } catch (err) {
            console.error('Error fetching gallery photos:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            isLoadingRef.current = false;
        }
    }, [hasMore, pageSize]);

    // Initial fetch
    useEffect(() => {
        fetchPhotos(true);
    }, []);

    const loadMore = () => fetchPhotos(false);

    return { photos, loading, hasMore, error, loadMore };
}
