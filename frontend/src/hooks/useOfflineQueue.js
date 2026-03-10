import { useState, useEffect, useCallback, useRef } from 'react';
import { uploadFile, compressImage } from '../services/storage';
import { createMemory, createSnapshot } from '../apiClient';
import { STORAGE_PATHS } from '../config/constants';
import { toast } from '../components/ui/PastelToast/PastelToast';

// ─────────────────────────────────────────────────────────────────────────────
// IndexedDB helpers
// ─────────────────────────────────────────────────────────────────────────────

const DB_NAME = 'capsule_offline_queue';
const DB_VERSION = 3; // Version 3: Ensure status index exists
const STORE_NAME = 'upload_queue';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;

            // 1. Upload Queue Store
            let uploadStore;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                uploadStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            } else {
                uploadStore = e.target.transaction.objectStore(STORE_NAME);
            }

            // Ensure status index exists
            if (!uploadStore.indexNames.contains('status')) {
                uploadStore.createIndex('status', 'status', { unique: false });
            }

            // 2. Pending Citas Store
            if (!db.objectStoreNames.contains('pending_citas')) {
                db.createObjectStore('pending_citas', { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAllPending() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const index = tx.objectStore(STORE_NAME).index('status');
        const req = index.getAll('pending');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function saveToQueue(item) {
    const db = await openDB();
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
            const item = { ...getReq.result, ...updates };
            store.put(item);
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

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Offline-capable photo upload queue using IndexedDB.
 *
 * When online: uploads immediately.
 * When offline: saves to IndexedDB and processes when back online.
 *
 * Usage:
 *   const { queueUpload, pendingCount, isProcessing } = useOfflineQueue();
 *   await queueUpload(file, memoryId, { uploadedBy, caption, ... });
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
        if (processingRef.current) return;
        processingRef.current = true;
        setIsProcessing(true);

        const DELAY_BETWEEN_UPLOADS = 3000;

        try {
            const pending = await getAllPending();
            // Sort FIFO (oldest first)
            pending.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

            for (const item of pending) {
                try {
                    await updateQueueItem(item.id, { status: 'uploading', retryCount: (item.retryCount ?? 0) + 1 });

                    if (item.type === 'photo') {
                        // Original photo-only upload
                        await uploadFile(item.compressedBlob, item.targetStoragePath);
                    } else if (item.type === 'memory') {
                        toast.info('Subiendo recuerdo...', 'Estamos guardando tus fotos en la nube ✨');
                        // Upload all photos, then create memory via Cloud Function
                        const photoUrls = [];
                        for (let i = 0; i < (item.photos?.length ?? 0); i++) {
                            const photo = item.photos[i];
                            const photoId = crypto.randomUUID();
                            const tempMemoryId = item.id; // Use queue item id as temp memory id
                            const storagePath = STORAGE_PATHS.PHOTO_ORIGINAL(tempMemoryId, photoId);
                            const url = await uploadFile(photo.blob, storagePath);
                            photoUrls.push({ url, storagePath, photoId });

                            if (i < item.photos.length - 1) {
                                await new Promise(r => setTimeout(r, DELAY_BETWEEN_UPLOADS));
                            }
                        }

                        // Call createMemory with the form data
                        await createMemory({
                            ...item.data,
                            offlinePhotoUrls: photoUrls,
                        });

                        // If it came from a pending cita, remove it now that it's successfully in Firestore
                        if (item.originalCitaId) {
                            // We need to call removePendingCita. 
                            // Since we don't have the hook here, we do it directly via DB.
                            const db = await openDB();
                            const tx = db.transaction('pending_citas', 'readwrite');
                            tx.objectStore('pending_citas').delete(item.originalCitaId);
                        }
                        toast.success('¡Recuerdo guardado!', 'Tu cita ya está en el mapa 📍');
                    } else if (item.type === 'snapshot') {
                        toast.info('Enviando instantánea...', 'Compartiendo tu momento 📸');
                        // Upload single photo, then create snapshot doc
                        const snapshotId = item.id;
                        const storagePath = STORAGE_PATHS.SNAPSHOT_ORIGINAL(snapshotId);
                        const blob = item.photos?.[0]?.blob ?? item.compressedBlob;
                        const url = await uploadFile(blob, storagePath);

                        await createSnapshot({
                            storagePath,
                            photoUrl: url,
                            message: item.data?.message ?? '',
                        });
                        toast.success('Instantánea enviada', '¡Listo! ✨');
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
                        toast.error('Error al subir', 'No pudimos guardar el recuerdo. Intenta de nuevo más tarde.');
                    } else {
                        await updateQueueItem(item.id, { status: 'pending', retryCount: newRetryCount });
                    }
                }

                // Rate limit between items
                await new Promise(r => setTimeout(r, DELAY_BETWEEN_UPLOADS));
            }
        } finally {
            processingRef.current = false;
            setIsProcessing(false);
            refreshCount();
        }
    }, [refreshCount]);

    // Listen to online/offline events
    useEffect(() => {
        refreshCount();

        const handleOnline = () => {
            processQueue();
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
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

        if (navigator.onLine) {
            // Upload immediately
            const url = await uploadFile(compressed, storagePath, onProgress);
            return { queued: false, url, photoId, storagePath };
        }

        // Save to IndexedDB queue for later
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

    return {
        queueUpload,
        queueMemory,
        queueSnapshot,
        pendingCount,
        isProcessing,
        processQueue,
    };
}
