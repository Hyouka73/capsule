import { useState, useEffect, useCallback } from 'react';

const DB_NAME = 'capsule_offline_queue';
const DB_VERSION = 3; // Version 3: Ensure status index exists
const STORE_NAME = 'pending_citas';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;

            // 1. Upload Queue Store
            let uploadStore;
            if (!db.objectStoreNames.contains('upload_queue')) {
                uploadStore = db.createObjectStore('upload_queue', { keyPath: 'id' });
            } else {
                uploadStore = e.target.transaction.objectStore('upload_queue');
            }

            // Ensure status index exists (Critical for useOfflineQueue)
            if (!uploadStore.indexNames.contains('status')) {
                uploadStore.createIndex('status', 'status', { unique: false });
            }

            // 2. Pending Citas Store
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

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

    return {
        pendingCitas,
        pendingCount,
        addPendingCita,
        removePendingCita,
        refreshPending
    };
}
