import { openDB } from '../config/dbConfig';
import { downloadAndCachePhoto } from './photoCache';

/**
 * Saves a list of memories to IndexedDB.
 */
export async function saveMemoriesToCache(memories, relationshipId) {
    if (!memories || memories.length === 0 || !relationshipId) return;

    try {
        const db = await openDB();
        const tx = db.transaction('memories', 'readwrite');
        const store = tx.objectStore('memories');

        memories.forEach(memory => {
            if (memory && memory.id) {
                // Ensure relationshipId is stamped for isolation
                store.put({
                    ...memory,
                    relationshipId,
                    cachedAt: new Date().toISOString()
                });

                // Trigger background photo caching
                if (memory.mainPhotoUrl) {
                    downloadAndCachePhoto(memory.id, memory.mainPhotoUrl);
                }
            }
        });

        await tx.done;
    } catch (err) {
        console.error('[MemoryPersistence] Error saving to cache:', err);
    }
}

/**
 * Retrieves a single memory from IndexedDB.
 */
export async function getMemoryFromCache(memoryId) {
    if (!memoryId) return null;

    try {
        const db = await openDB();
        const tx = db.transaction('memories', 'readonly');
        const store = tx.objectStore('memories');
        const request = store.get(memoryId);

        return new Promise((resolve) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });
    } catch (err) {
        console.error('[MemoryPersistence] Error reading from cache:', err);
        return null;
    }
}

/**
 * Retrieves all cached memories for a relationship.
 */
export async function getAllCachedMemories(relationshipId) {
    if (!relationshipId) return [];

    try {
        const db = await openDB();
        const tx = db.transaction('memories', 'readonly');
        const store = tx.objectStore('memories');
        const index = store.index('relationshipId');
        const request = index.getAll(relationshipId);

        return new Promise((resolve) => {
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => resolve([]);
        });
    } catch (err) {
        console.error('[MemoryPersistence] Error reading all from cache:', err);
        return [];
    }
}
