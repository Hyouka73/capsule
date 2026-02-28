import { useState, useEffect, useCallback, useRef } from 'react';
import {
    collection,
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
            // --- 1. Fetch memory photos (non-snapshot photos) ---
            let photosQuery;
            const photosCol = collectionGroup(db, 'photos');

            if (isInitial) {
                photosQuery = query(
                    photosCol,
                    where('isSnapshot', '!=', true),
                    orderBy('isSnapshot', 'asc'),
                    orderBy('createdAt', 'desc'),
                    limit(pageSize)
                );
            } else if (lastDocRef.current) {
                photosQuery = query(
                    photosCol,
                    where('isSnapshot', '!=', true),
                    orderBy('isSnapshot', 'asc'),
                    orderBy('createdAt', 'desc'),
                    startAfter(lastDocRef.current),
                    limit(pageSize)
                );
            }

            let memoryPhotos = [];
            if (photosQuery) {
                const snapshot = await getDocs(photosQuery);
                memoryPhotos = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    parentPath: doc.ref.parent.parent?.path,
                    _type: 'memory',
                }));
                lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
                setHasMore(snapshot.docs.length === pageSize);
            }

            // --- 2. Fetch archived snapshots (only on initial load) ---
            let archivedSnapshots = [];
            if (isInitial) {
                const snapshotsQuery = query(
                    collection(db, 'instantaneas'),
                    where('isArchived', '==', true),
                    orderBy('createdAt', 'desc'),
                    limit(pageSize)
                );
                const snapshotsSnap = await getDocs(snapshotsQuery);
                archivedSnapshots = snapshotsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    url: doc.data().photoUrl,
                    _type: 'snapshot',
                    isSnapshot: true,
                    wasUnseen: !doc.data().isSeen,
                }));
            }

            // --- 3. Merge and sort chronologically ---
            const allPhotos = [...memoryPhotos, ...archivedSnapshots].sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() ?? a.createdAt?.seconds * 1000 ?? 0;
                const bTime = b.createdAt?.toMillis?.() ?? b.createdAt?.seconds * 1000 ?? 0;
                return bTime - aTime; // Newest first
            });

            if (isInitial) {
                setPhotos(allPhotos);
            } else {
                setPhotos(prev => [...prev, ...memoryPhotos]);
            }
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
