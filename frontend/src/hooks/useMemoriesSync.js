import { useEffect, useRef } from 'react';
import { callBackendApi } from '../apiClient';
import { useAuth } from './useAuth';
import { useAppConfig } from './useAppConfig';
import { saveMemoriesToCache } from '../utils/memoryPersistence';

/**
 * Hook to synchronize all memories for the current relationship to IndexedDB.
 * Smart Sync: Only triggers if the remote update timestamp is newer than the local one.
 */
export function useMemoriesSync() {
    const { relationshipId, user } = useAuth();
    const { config } = useAppConfig();
    const isSyncingRef = useRef(false);

    useEffect(() => {
        if (!relationshipId || !user || !config || isSyncingRef.current) return;

        // Smart Sync Logic:
        // Compare remote update timestamp with local last sync version
        const lastSyncVersion = parseInt(localStorage.getItem('last_memory_sync_version') || '0', 10);
        
        // Normalize server timestamp
        const remoteUpdate = typeof config.lastMemoriesUpdate === 'object' 
            ? config.lastMemoriesUpdate?.toMillis?.() || 0 
            : (config.lastMemoriesUpdate || 0);

        // ONLY sync if there is a newer update on the server or no sync has occurred
        if (remoteUpdate <= lastSyncVersion && lastSyncVersion !== 0) {
            return;
        }

        async function syncMemories() {
            if (!navigator.onLine) return;
            
            isSyncingRef.current = true;
            try {
                // Fetch ALL memories metadata
                const result = await callBackendApi('getGallery', { 
                    limit: 1000 
                });

                if (result.success && result.photos) {
                    const memories = result.photos.filter(item => item._type === 'memory');
                    
                    if (memories.length > 0) {
                        await saveMemoriesToCache(memories, relationshipId);
                        
                        // Update local sync version
                        localStorage.setItem('last_memory_sync_version', remoteUpdate.toString());
                    }
                }
            } catch (err) {
                console.error('[SmartSync] Error syncing memories:', err);
            } finally {
                isSyncingRef.current = false;
            }
        }

        syncMemories();

        // Also sync when coming back online
        const handleOnline = () => syncMemories();
        window.addEventListener('online', handleOnline);
        
        return () => window.removeEventListener('online', handleOnline);
    }, [relationshipId, user, config?.lastMemoriesUpdate]);
}
