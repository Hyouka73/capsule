import { useState, useEffect, useCallback } from 'react';

import { openDB } from '../config/dbConfig';
const STORE_NAME = 'pending_citas';

export function usePendingCitas() {
    const [pendingCitas, setPendingCitas] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);

    const refreshPending = useCallback(async () => {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const results = request.result || [];
                // Generate object URLs for preview but keep original Blobs
                const withUrls = results.map(item => {
                    const photosWithUrls = item.photos.map(p => ({
                        ...p,
                        objectUrl: URL.createObjectURL(p.file)
                    }));
                    return {
                        ...item,
                        photos: photosWithUrls,
                        coverPhoto: photosWithUrls[0]?.objectUrl
                    };
                });
                setPendingCitas(withUrls);
                setPendingCount(results.length);
            };
        } catch (err) {
            console.error('[usePendingCitas] Error refreshing:', err);
        }
    }, []);

    useEffect(() => {
        refreshPending();
    }, [refreshPending]);

    const addPendingCita = async (files, context = null) => {
        const db = await openDB();
        const id = crypto.randomUUID();
        const newItem = {
            id,
            createdAt: Date.now(),
            photos: files.map(file => ({
                file, // Original Blob/File
                name: file.name,
                type: file.type
            })),
            originalDate: new Date().toLocaleDateString('es-MX', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
            }),
            context
        };

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.add(newItem);
            tx.oncomplete = () => {
                refreshPending();
                resolve(id);
            };
            tx.onerror = () => reject(tx.error);
        });
    };

    const removePendingCita = async (id) => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.delete(id);
            tx.oncomplete = () => {
                refreshPending();
                resolve();
            };
            tx.onerror = () => reject(tx.error);
        });
    };

    const updatePendingCitaStatus = async (id, status) => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const getReq = store.get(id);
            getReq.onsuccess = () => {
                const item = getReq.result;
                if (item) {
                    item.status = status;
                    store.put(item);
                }
            };
            tx.oncomplete = () => {
                refreshPending();
                resolve();
            };
            tx.onerror = () => reject(tx.error);
        });
    };

    const updatePendingCita = async (id, updates) => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const getReq = store.get(id);
            getReq.onsuccess = () => {
                const item = getReq.result;
                if (item) {
                    const updated = { ...item, ...updates };
                    store.put(updated);
                }
            };
            tx.oncomplete = () => {
                refreshPending();
                resolve();
            };
            tx.onerror = () => reject(tx.error);
        });
    };

    return {
        pendingCitas,
        pendingCount,
        addPendingCita,
        removePendingCita,
        updatePendingCitaStatus,
        updatePendingCita,
        refreshPending
    };
}
