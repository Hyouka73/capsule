import { useState, useEffect } from 'react';
import { getPhotoFromCache, downloadAndCachePhoto } from '../utils/photoCache';

/**
 * Hook to manage cached photos with automatic background downloading.
 * 
 * @param {string} id - Unique ID for the photo (e.g., memoryId)
 * @param {string} originalUrl - Remote URL to use as fallback/source
 * @returns {string} The Blob URL if cached, otherwise originalUrl
 */
export function usePhotoCache(id, originalUrl) {
    const [displayUrl, setDisplayUrl] = useState(originalUrl);

    useEffect(() => {
        let blobUrl = null;

        async function resolvePhoto() {
            if (!id) return;

            const blob = await getPhotoFromCache(id);
            if (blob) {
                blobUrl = URL.createObjectURL(blob);
                setDisplayUrl(blobUrl);
            } else if (originalUrl) {
                setDisplayUrl(originalUrl);
                // Trigger background cache for next time
                if (navigator.onLine) {
                    downloadAndCachePhoto(id, originalUrl);
                }
            }
        }

        resolvePhoto();

        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [id, originalUrl]);

    return displayUrl;
}
