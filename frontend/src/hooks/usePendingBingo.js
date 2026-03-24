import { useState, useCallback, useEffect } from 'react';
import { openDB } from '../config/dbConfig';

/**
 * Hook to manage offline Bingo suggestions that were captured
 * asynchronously via background sync in `useOfflineQueue.js`.
 */
export function usePendingBingo() {
    const [pendingSuggestions, setPendingSuggestions] = useState([]);

    const fetchPending = useCallback(async () => {
        try {
            const db = await openDB();
            const tx = db.transaction('pending_bingo', 'readonly');
            const store = tx.objectStore('pending_bingo');
            
            const allItems = await new Promise((resolve) => {
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
            });
            
            setPendingSuggestions(allItems.filter(item => !item.resolved));
        } catch (err) {
            console.error('[usePendingBingo] Error fetching:', err);
        }
    }, []);

    useEffect(() => {
        fetchPending();
        
        // Listen to visibility to refresh when coming back to the app
        const handleVisibility = () => {
             if (document.visibilityState === 'visible') fetchPending();
        };
        // Listen to local changes
        const handleLocalChange = () => fetchPending();
        
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('pending_bingo_updated', handleLocalChange);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('pending_bingo_updated', handleLocalChange);
        };
    }, [fetchPending]);

    const resolvePendingSuggestion = useCallback(async (memoryId) => {
        try {
            const db = await openDB();
            const tx = db.transaction('pending_bingo', 'readwrite');
            const store = tx.objectStore('pending_bingo');
            const getReq = store.get(memoryId);
            
            getReq.onsuccess = () => {
                const item = getReq.result;
                if (item) {
                    item.resolved = true;
                    store.put(item);
                }
            };
            
            await new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
            
            await fetchPending();
        } catch (err) {
            console.error('[usePendingBingo] Error marking resolved:', err);
        }
    }, [fetchPending]);

    const dismissSuggestion = useCallback(async (memoryId) => {
        try {
            const db = await openDB();
            const tx = db.transaction('pending_bingo', 'readwrite');
            const store = tx.objectStore('pending_bingo');
            const getReq = store.get(memoryId);
            
            getReq.onsuccess = () => {
                const item = getReq.result;
                if (item) {
                    item.dismissed = true;
                    store.put(item);
                }
            };
            
            await new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
            
            await fetchPending();
        } catch (err) {
            console.error('[usePendingBingo] Error marking dismissed:', err);
        }
    }, [fetchPending]);

    return {
        pendingSuggestions,
        resolvePendingSuggestion,
        dismissSuggestion,
        refreshPending: fetchPending
    };
}
