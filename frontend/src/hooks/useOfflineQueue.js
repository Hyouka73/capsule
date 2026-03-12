import { useState, useEffect, useCallback, useRef } from 'react';
import { uploadFile, compressImage } from '../services/storage';
import { createMemory, createSnapshot, findOrCreatePlace } from '../apiClient';
import { STORAGE_PATHS } from '../config/constants';
import Memory from '../models/Memory';
import { toast } from '../components/ui/PastelToast/PastelToast';

// ─────────────────────────────────────────────────────────────────────────────
// IndexedDB helpers
// ─────────────────────────────────────────────────────────────────────────────

import { openDB } from '../config/dbConfig';
const STORE_NAME = 'upload_queue';

// Global lock to prevent multiple hook instances from running sync concurrently
let isProcessingGlobal = false;

async function getAllPending() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
            const results = req.result || [];
            // Filter for items that are 'pending' or 'uploading' 
            // We EXCLUDE 'failed' items from the automatic background sync
            resolve(results.filter(item =>
                item.status === 'pending' ||
                item.status === 'uploading'
            ));
        };
        req.onerror = () => reject(req.error);
    });
}

async function saveToQueue(item) {
    const db = await openDB();

    // If this item is associated with a citation, clean up existing queue items for that citation
    if (item.originalCitaId) {
        const txSync = db.transaction(STORE_NAME, 'readwrite');
        const storeSync = txSync.objectStore(STORE_NAME);
        const allItems = await new Promise(r => {
            const req = storeSync.getAll();
            req.onsuccess = () => r(req.result || []);
        });

        for (const existing of allItems) {
            if (existing.originalCitaId === item.originalCitaId && existing.id !== item.id) {
                storeSync.delete(existing.id);
            }
        }
    }

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function updateQueueItem(id, updates) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
            if (!getReq.result) return;
            const updatedItem = { ...getReq.result, ...updates };
            store.put(updatedItem);

            // If status is updating, sync with pending citations
            if (updates.status && updatedItem.originalCitaId) {
                syncCitaStatus(updatedItem.originalCitaId, updates.status);
            }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function removeFromQueue(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * Synchronize the status of a citation in the pending_citas store.
 */
async function syncCitaStatus(citaId, status) {
    if (!citaId) return;
    try {
        const db = await openDB();
        const tx = db.transaction('pending_citas', 'readwrite');
        const store = tx.objectStore('pending_citas');
        const getReq = store.get(citaId);
        getReq.onsuccess = () => {
            const item = getReq.result;
            if (item) {
                item.status = status;
                store.put(item);
            }
        };
        await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (err) {
        console.error('[offlineQueue] Error syncing cita status:', err);
    }
}

/**
 * Offline-capable photo upload queue using IndexedDB.
 */
export function useOfflineQueue() {
    const [pendingCount, setPendingCount] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const processingRef = useRef(false);

    // Refresh pending count from IndexedDB
    const refreshCount = useCallback(async () => {
        try {
            const pending = await getAllPending();
            setPendingCount(pending.length);
        } catch {
            // IndexedDB not available (e.g. private browsing)
        }
    }, []);

    // Process all pending uploads
    const processQueue = useCallback(async () => {
        if (processingRef.current || isProcessingGlobal) return;

        // Check connectivity before starting
        if (!navigator.onLine) {
            refreshCount();
            return;
        }

        const pending = await getAllPending();
        if (pending.length === 0) {
            refreshCount();
            return;
        }

        processingRef.current = true;
        isProcessingGlobal = true;
        setIsProcessing(true);

        const DELAY_BETWEEN_UPLOADS = 3000;

        try {
            // Sort FIFO (oldest first)
            pending.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

            for (const item of pending) {
                // If we lost connection mid-process, stop
                if (!navigator.onLine) break;

                try {
                    // Reset retry count if it was marked as failed before
                    const currentRetries = item.status === 'failed' ? 0 : (item.retryCount ?? 0);
                    await updateQueueItem(item.id, { status: 'uploading', retryCount: currentRetries + 1 });

                    if (item.type === 'photo') {
                        await uploadFile(item.compressedBlob, item.targetStoragePath);
                    } else if (item.type === 'memory') {
                        toast.info('Sincronizando recuerdo...', 'Guardando tus momentos pendientes ✨');
                        const photoUrls = [];
                        for (let i = 0; i < (item.photos?.length ?? 0); i++) {
                            const photo = item.photos[i];
                            const photoId = crypto.randomUUID();
                            const tempMemoryId = item.id;
                            const storagePath = STORAGE_PATHS.PHOTO_ORIGINAL(tempMemoryId, photoId);
                            const url = await uploadFile(photo.blob, storagePath);
                            photoUrls.push({ url, storagePath, photoId });

                            if (i < item.photos.length - 1) {
                                await new Promise(r => setTimeout(r, DELAY_BETWEEN_UPLOADS));
                            }
                        }

                        const memoryModel = Memory.fromForm(item.data);
                        memoryModel.offlinePhotoUrls = photoUrls;

                        // CRITICAL: If no placeId but we have coordinates, find or create the place first
                        // so it appears on the map as a pin.
                        if (!memoryModel.placeId && memoryModel.placeLat && memoryModel.placeLng) {
                            try {
                                console.log('[offlineQueue] Creating missing place for memory...');
                                const placeResult = await findOrCreatePlace({
                                    lat: memoryModel.placeLat,
                                    lng: memoryModel.placeLng,
                                    name: memoryModel.placeName,
                                });

                                if (placeResult?.success && placeResult?.placeId) {
                                    memoryModel.placeId = placeResult.placeId;
                                    console.log('[offlineQueue] Place created/found:', placeResult.placeId);
                                }
                            } catch (placeErr) {
                                console.error('[offlineQueue] findOrCreatePlace failed:', placeErr);
                                // CRITICAL: coordinates remain in the payload even if place creation fails
                            }
                        }

                        await createMemory({
                            ...memoryModel.toApiPayload(),
                            offlinePhotoUrls: photoUrls,
                            // Ensure coordinates always reach the backend as fallback
                            placeLat: memoryModel.placeLat,
                            placeLng: memoryModel.placeLng,
                            placeName: memoryModel.placeName,
                        });

                        if (item.originalCitaId) {
                            const db = await openDB();
                            const tx = db.transaction('pending_citas', 'readwrite');
                            tx.objectStore('pending_citas').delete(item.originalCitaId);
                        }
                        toast.success('¡Recuerdo sincronizado!', 'Ya está disponible en tu mapa 📍');
                    } else if (item.type === 'snapshot') {
                        const snapshotId = item.id;
                        const storagePath = STORAGE_PATHS.SNAPSHOT_ORIGINAL(snapshotId);
                        const blob = item.photos?.[0]?.blob ?? item.compressedBlob;
                        const url = await uploadFile(blob, storagePath);

                        await createSnapshot({
                            storagePath,
                            photoUrl: url,
                            message: item.data?.message ?? '',
                        });
                        toast.success('Instantánea sincronizada ✨');
                    }

                    await removeFromQueue(item.id);
                } catch (err) {
                    console.error('[offlineQueue] Item failed:', err);
                    const newRetryCount = (item.retryCount ?? 0) + 1;
                    if (newRetryCount >= 3) {
                        await updateQueueItem(item.id, { status: 'failed' });
                        if (item.originalCitaId) {
                            const db = await openDB();
                            const tx = db.transaction('pending_citas', 'readwrite');
                            const store = tx.objectStore('pending_citas');
                            const cita = await new Promise(r => {
                                const req = store.get(item.originalCitaId);
                                req.onsuccess = () => r(req.result);
                            });
                            if (cita) {
                                cita.status = 'failed';
                                store.put(cita);
                            }
                        }
                    } else {
                        await updateQueueItem(item.id, { status: 'pending', retryCount: newRetryCount });
                    }
                }

                await new Promise(r => setTimeout(r, DELAY_BETWEEN_UPLOADS));
            }
        } finally {
            processingRef.current = false;
            isProcessingGlobal = false;
            setIsProcessing(false);
            refreshCount();
        }
    }, [refreshCount]);

    // Intelligent Sync Triggers
    useEffect(() => {
        refreshCount();

        // 0. Cleanup stuck uploading items on mount
        const cleanupStuck = async () => {
            const current = await getAllPending();
            const stuck = current.filter(i => i.status === 'uploading');

            if (stuck.length > 0) {
                console.log('[offlineQueue] Cleaning up stuck items:', stuck.map(s => s.id));
                for (const item of stuck) {
                    await updateQueueItem(item.id, { status: 'pending' });
                }
                refreshCount();
            }
        };

        cleanupStuck().then(() => {
            // After initial cleanup, also check for any item that might have been 
            // stuck during this session (rare, but possible if a throw happens)
            if (navigator.onLine) {
                processQueue();
            }
        });

        // 2. Sync on connectivity change
        const handleOnline = () => {
            toast.info('Conexión restaurada', 'Sincronizando recuerdos pendientes...');
            processQueue();
        };

        // 3. Sync on tab becoming visible (returning to app)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && navigator.onLine) {
                processQueue();
            }
        };

        // 4. Periodic heartbeat (every 2 minutes)
        const heartbeat = setInterval(() => {
            if (navigator.onLine) processQueue();
        }, 120000);

        window.addEventListener('online', handleOnline);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('online', handleOnline);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(heartbeat);
        };
    }, [processQueue, refreshCount]);

    /**
     * Queue a file for upload (or upload immediately if online).
     *
     * @param {File} file - Raw file from input
     * @param {string} memoryId - Target memory ID
     * @param {object} meta - { uploadedBy, caption, capturedAt, gpsCoordinates, isMain }
     * @param {Function} [onProgress] - Progress callback (only used when online)
     * @returns {Promise<{queued: boolean, url?: string}>}
     */
    const queueUpload = useCallback(async (file, memoryId, meta = {}, onProgress = null) => {
        const compressed = await compressImage(file, 1200, 0.8);
        const photoId = crypto.randomUUID();
        const storagePath = STORAGE_PATHS.PHOTO_ORIGINAL(memoryId, photoId);

        // ALWAYS save to IndexedDB queue first for persistence
        await saveToQueue({
            id: photoId,
            type: 'photo',
            localFileUri: URL.createObjectURL(compressed),
            compressedBlob: compressed,
            targetStoragePath: storagePath,
            targetMemoryId: memoryId,
            firestoreUpdates: meta.firestoreUpdates ?? null,
            status: 'pending',
            retryCount: 0,
            createdAt: Date.now(),
        });

        await refreshCount();

        // If online, trigger processing
        if (navigator.onLine) {
            processQueue();
        }

        return { queued: true, photoId, storagePath };
    }, [refreshCount]);

    /**
     * Queue a complete memory (form data + photo files) for offline upload.
     *
     * @param {object} formData - Memory form fields (title, eventDate, tags, etc.)
     * @param {File[]} photoFiles - Array of raw photo files
     * @param {string} originalCitaId - Optional ID of the pending cita this came from
     * @returns {Promise<{queued: boolean}>}
     */
    const queueMemory = useCallback(async (formData, photoFiles, originalCitaId = null) => {
        const compressedPhotos = await Promise.all(
            photoFiles.map(async (file) => {
                const blob = await compressImage(file, 1200, 0.8);
                return { blob, fileName: file.name, size: blob.size, mimeType: 'image/jpeg' };
            })
        );

        await saveToQueue({
            id: crypto.randomUUID(),
            type: 'memory',
            data: formData,
            photos: compressedPhotos,
            originalCitaId,
            status: 'pending',
            retryCount: 0,
            createdAt: Date.now(),
        });

        await refreshCount();

        // Try processing immediately if online
        if (navigator.onLine) {
            processQueue();
        }

        return { queued: true };
    }, [refreshCount, processQueue]);

    /**
     * Queue a snapshot photo for offline upload.
     *
     * @param {File} photoFile - The snapshot photo file
     * @param {string} message - Optional short message
     * @returns {Promise<{queued: boolean}>}
     */
    const queueSnapshot = useCallback(async (photoFile, message = '') => {
        const blob = await compressImage(photoFile, 1200, 0.8);

        await saveToQueue({
            id: crypto.randomUUID(),
            type: 'snapshot',
            data: { message },
            photos: [{ blob, fileName: photoFile.name, size: blob.size, mimeType: 'image/jpeg' }],
            status: 'pending',
            retryCount: 0,
            createdAt: Date.now(),
        });

        await refreshCount();

        if (navigator.onLine) {
            processQueue();
        }

        return { queued: true };
    }, [refreshCount, processQueue]);

    /**
     * Resets a failed item to pending status so it can be retried.
     */
    const retryItem = useCallback(async (id) => {
        await updateQueueItem(id, { status: 'pending', retryCount: 0 });
        await refreshCount();
        if (navigator.onLine) processQueue();
    }, [refreshCount, processQueue]);

    /**
     * Gets all snapshots currently in the offline queue.
     */
    const getPendingSnapshots = useCallback(async () => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => {
                const results = req.result || [];
                resolve(results.filter(item => item.type === 'snapshot' && item.status !== 'failed'));
            };
            req.onerror = () => reject(req.error);
        });
    }, []);

    return {
        queueUpload,
        queueMemory,
        queueSnapshot,
        pendingCount,
        isProcessing,
        processQueue,
        retryItem,
        getPendingSnapshots,
    };
}
