import { useState, useEffect } from 'react';
import { getThumbnail } from '../utils/offlineCache';

/**
 * Hook to handle loading and revoking a cached thumbnail for a place.
 * 
 * @param {string} placeId - The ID of the place
 * @param {string} originalUrl - The remote URL to fallback to
 * @returns {string} The URL to use (Blob OR remote)
 */
export function useCacheThumbnail(placeId, originalUrl) {
    const [displayUrl, setDisplayUrl] = useState(originalUrl);

    useEffect(() => {
        let blobUrl = null;

        async function checkCache() {
            if (!placeId) return;
            
            const cachedBlobUrl = await getThumbnail(placeId);
            if (cachedBlobUrl) {
                // If we have a cache, use it!
                setDisplayUrl(cachedBlobUrl);
                blobUrl = cachedBlobUrl;
            } else {
                // Fallback to original
                setDisplayUrl(originalUrl);
            }
        }

        checkCache();

        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [placeId, originalUrl]);

    return displayUrl;
}
