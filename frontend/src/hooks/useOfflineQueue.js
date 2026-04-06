import { useState, useEffect, useCallback, useRef } from 'react';
import { uploadFile, compressImage, processImagePair } from '../services/storage';
import { createMemory, createSnapshot, findOrCreatePlace, updateBingoSquare, createCapsule } from '../apiClient';
import { STORAGE_PATHS } from '../config/constants';
import Memory from '../models/Memory';
import { toast } from '../components/ui/PastelToast/PastelToast';
import { useBingo } from './useBingo';

// ─────────────────────────────────────────────────────────────────────────────
// IndexedDB helpers
// ─────────────────────────────────────────────────────────────────────────────

import { openDB, getStoreKey } from '../config/dbConfig';
import { useAuth } from './useAuth';
import { generateUUID } from '../utils/uuid';
const STORE_NAME = 'upload_queue';

// Global lock to prevent multiple hook instances from running sync concurrently
let isProcessingGlobal = false;

async function getAllPending(relationshipId) {
    if (!relationshipId) return [];
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    
    // Efficiently get all items
    const all = await new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });

    // Filter by relationshipId and status
    return all.filter(item => 
        item.relationshipId === relationshipId &&
        (item.status === 'pending' || item.status === 'uploading')
    );
}

async function getAllFailed(relationshipId) {
    if (!relationshipId) return [];
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const all = await new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });

    return all.filter(item => 
        item.relationshipId === relationshipId && 
        item.status === 'failed'
    );
}

async function clearFailedFromDB(relationshipId) {
    if (!relationshipId) return;
    const db = await openDB();
    const failed = await getAllFailed(relationshipId);
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const item of failed) {
        store.delete(item.id);
    }
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function saveToQueue(item) {
    if (!item.relationshipId) {
        throw new Error('[useOfflineQueue] Cannot save item without relationshipId');
    }

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
            if (existing.relationshipId === item.relationshipId && 
                existing.originalCitaId === item.originalCitaId && 
                existing.id !== item.id) {
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
                syncCitaStatus(updatedItem.originalCitaId, updates.status, updatedItem.relationshipId);
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
async function syncCitaStatus(citaId, status, relationshipId) {
    if (!citaId || !relationshipId) return;
    try {
        const db = await openDB();
        const tx = db.transaction('pending_citas', 'readwrite');
        const store = tx.objectStore('pending_citas');
        
        // Citations use prefixed keys too
        const key = getStoreKey(citaId, relationshipId);
        const getReq = store.get(key);
        
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
        // Reduced visibility for standard production errors
    }
}

/**
 * Offline-capable photo upload queue using IndexedDB.
 */
export function useOfflineQueue() {
    const { relationshipId } = useAuth();
    const { completeBingoSquare, enqueueBingoSuggestion } = useBingo();
    const [pendingCount, setPendingCount] = useState(0);
    const [failedCount, setFailedCount] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const processingRef = useRef(false);

    // Refresh pending count from IndexedDB
    const refreshCount = useCallback(async () => {
        if (!relationshipId) return;
        try {
            const pending = await getAllPending(relationshipId);
            const failed = await getAllFailed(relationshipId);
            setPendingCount(pending.length);
            setFailedCount(failed.length);
        } catch (err) {
            // Silently handle refresh errors
        }
    }, [relationshipId]);

    // Process all pending uploads
    const processQueue = useCallback(async () => {
        if (!relationshipId || processingRef.current || isProcessingGlobal) return;

        // Check connectivity before starting
        if (!navigator.onLine) {
            refreshCount();
            return;
        }

        const pending = await getAllPending(relationshipId);
        if (pending.length === 0) {
            refreshCount();
            return;
        }

        processingRef.current = true;
        isProcessingGlobal = true;
        setIsProcessing(true);

        const DELAY_BETWEEN_UPLOADS = 3000;
        let newBingoSuggestionsCount = 0;

        try {
            // Sort FIFO (oldest first)
            pending.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

            for (const item of pending) {
                // If we lost connection mid-process, stop
                if (!navigator.onLine) break;

                // SECURITY VALIDATION: Skip items from other relationships
                if (item.relationshipId !== relationshipId) {
                    continue;
                }

                try {
                    // Reset retry count if it was marked as failed before
                    const currentRetries = item.status === 'failed' ? 0 : (item.retryCount ?? 0);
                    await updateQueueItem(item.id, { status: 'uploading', retryCount: currentRetries + 1 });

                    if (item.type === 'photo') {
                        await uploadFile(item.compressedBlob, item.targetStoragePath);
                    } else if (item.type === 'memory') {
                        const photoUrls = [];
                        for (let i = 0; i < (item.photos?.length ?? 0); i++) {
                            const photo = item.photos[i];
        const photoId = generateUUID();
                            const tempMemoryId = item.id;
                            
                            // 1. Upload Original
                            const storagePath = `${relationshipId}/memories/${item.originalId || tempMemoryId}/${photoId}.webp`;
                            const url = await uploadFile(photo.blob, storagePath, { 
                                isMain: String(!!photo.isMain),
                                originalName: photo.fileName || ''
                            });

                            // 2. Upload Thumbnail if exists
                            let thumbUrl = null;
                            if (photo.thumb) {
                                const thumbPath = `${relationshipId}/memories/${item.originalId || tempMemoryId}/${photoId}_thumb.webp`;
                                thumbUrl = await uploadFile(photo.thumb, thumbPath, { isThumb: 'true' });
                            }

                            photoUrls.push({ 
                                url, 
                                thumbUrl, 
                                storagePath, 
                                photoId, 
                                isMain: !!photo.isMain 
                            });

                            if (i < item.photos.length - 1) {
                                await new Promise(r => setTimeout(r, DELAY_BETWEEN_UPLOADS));
                            }
                        }

                        const memoryModel = Memory.fromForm(item.data);
                        memoryModel.offlinePhotoUrls = photoUrls;

                        // COORDINATES FALLBACK: If no placeId but we have coordinates, find or create the place first
                        if (!memoryModel.placeId && memoryModel.placeLat && memoryModel.placeLng) {
                            try {
                                const placeResult = await findOrCreatePlace({
                                    lat: memoryModel.placeLat,
                                    lng: memoryModel.placeLng,
                                    name: memoryModel.placeName,
                                });

                                if (placeResult?.success && placeResult?.placeId) {
                                    memoryModel.placeId = placeResult.placeId;
                                }
                            } catch (placeErr) {
                                // Standard error handling
                            }
                        }

                        const res = await createMemory({
                            ...memoryModel.toApiPayload(),
                            id: item.id, // Enforce using the same ID as the storage folder
                            offlinePhotoUrls: photoUrls,
                            // Ensure coordinates always reach the backend as fallback
                            placeLat: memoryModel.placeLat,
                            placeLng: memoryModel.placeLng,
                            placeName: memoryModel.placeName,
                        });

                        // ── BINGO INTEGRATION ──────────
                        if (item.bingoOrigin?.categoryId) {
                            // If this memory was EXPLICITLY started from a bingo square,
                            // complete it automatically and IGNORE general suggestions.
                            await updateBingoSquare({ 
                                categoryId: item.bingoOrigin.categoryId, 
                                memoryId: item.id,
                                completedAt: item.bingoOrigin.completedAt
                            });
                        } else if (res?.bingoSuggestions?.length > 0) {
                            // Only save suggestions if it WASN'T an explicit bingo date
                            try {
                                const db = await openDB();
                                const tx = db.transaction('pending_bingo', 'readwrite');
                                tx.objectStore('pending_bingo').put({
                                    memoryId: item.id,
                                    suggestions: res.bingoSuggestions,
                                    createdAt: Date.now(),
                                    resolved: false
                                });
                                // Trigger update to UI (for lightbulbs)
                                window.dispatchEvent(new Event('pending_bingo_updated'));
                                
                                // NEW: Enqueue for sequential UI Queue
                                enqueueBingoSuggestion(item.id, res.bingoSuggestions);
                                newBingoSuggestionsCount++;
                            } catch (e) {
                                // Fail silently in prod per requirements
                            }
                        }

                        if (item.originalCitaId) {
                            const db = await openDB();
                            const tx = db.transaction('pending_citas', 'readwrite');
                            tx.objectStore('pending_citas').delete(item.originalCitaId);
                        }
                        toast.success('¡Recuerdo sincronizado!', 'Ya está disponible en tu mapa 📍');
                    } else if (item.type === 'snapshot') {
                        const snapshotId = item.originalId || item.id.split('_').pop();
                        const storagePath = `${relationshipId}/snapshots/${snapshotId}.webp`;
                        const blob = item.photos?.[0]?.blob ?? item.compressedBlob;

                        // 1. Registrar en Firestore PRIMERO → el doc tendrá createdBy ✓
                        await createSnapshot({
                            id: snapshotId,
                            storagePath,
                            photoUrl: '', // onPhotoUploaded lo actualizará
                            message: item.data?.message ?? '',
                        });

                        // 2. Subir la foto
                        await uploadFile(blob, storagePath, { isSnapshot: 'true' });

                        toast.success('Instantánea sincronizada ✨');
                    } else if (item.type === 'capsule') {
                        const fileUrls = [];
                        for (let i = 0; i < (item.files?.length ?? 0); i++) {
                            const file = item.files[i];
                             const fileId = generateUUID();
                             const storagePath = STORAGE_PATHS.CAPSULE_ORIGINAL(relationshipId, item.originalId || item.id, fileId);
                            const url = await uploadFile(file.blob, storagePath);
                            fileUrls.push({ 
                                url, 
                                storagePath, 
                                fileId, 
                                fileName: file.fileName,
                                mimeType: file.mimeType || 'application/octet-stream',
                                size: file.size || 0
                            });

                            if (i < item.files.length - 1) {
                                await new Promise(r => setTimeout(r, DELAY_BETWEEN_UPLOADS));
                            }
                        }

                        await createCapsule({
                            ...item.data,
                            id: cleanId, 
                            attachments: fileUrls
                        });
                        const wasEdit = !!item.existingCapsuleId;
                        toast.success(
                            wasEdit ? '¡Cápsula actualizada!' : '¡Cápsula enterrada!',
                            wasEdit ? 'Los cambios se guardaron ✅' : 'Tu pareja la recibirá en el momento indicado ✨'
                        );
                    } else if (item.type === 'delete-capsule') {
                        await deleteCapsule({ capsuleId: item.capsuleId });
                    }

                    await removeFromQueue(item.id);
                    
                    // Broadcast successful sync to other tabs/hooks
                    if (window.BroadcastChannel) {
                        const channel = new BroadcastChannel('capsule_sync');
                        channel.postMessage({ type: 'SYNC_COMPLETE', id: item.id, itemType: item.type });
                        channel.close();
                    }
                } catch (err) {
                    // Fail silently in prod - errors are handled by retry limits
                    const currentRetries = item.retryCount ?? 0;
                    const newRetryCount = currentRetries + 1;
                    
                    if (newRetryCount >= 3) {
                        // Mark as permanent fail
                        await updateQueueItem(item.id, { status: 'failed', retryCount: newRetryCount });
                        if (item.originalCitaId) {
                            await syncCitaStatus(item.originalCitaId, 'failed');
                        }
                    } else {
                        // Mark for later retry
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

            if (newBingoSuggestionsCount > 0) {
                toast.success(
                    '🎉 Nuevas sugerencias', 
                    `Tienes ${newBingoSuggestionsCount} sugerencias de bingo pendientes.`
                );
            }
        }
    }, [refreshCount, completeBingoSquare]);

    // Intelligent Sync Triggers
    useEffect(() => {
        refreshCount();

        // 0. Cleanup stuck uploading items on mount
        const cleanupStuck = async () => {
            if (!relationshipId) return;
            const current = await getAllPending(relationshipId);
            const stuck = current.filter(i => i.status === 'uploading');

            if (stuck.length > 0) {
                for (const item of stuck) {
                    await updateQueueItem(item.id, { status: 'pending' });
                }
                refreshCount();
            }
        };

        const init = async () => {
            await cleanupStuck();
            if (navigator.onLine) {
                processQueue();
            }
        };

        init();

        // 2. Sync on connectivity change
        const handleOnline = () => {
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
    }, [processQueue, refreshCount, relationshipId]);

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
        const compressed = await compressImage(file, { maxWidth: 1200, initialQuality: 0.8 });
        const photoId = generateUUID();
        const storagePath = STORAGE_PATHS.PHOTO_ORIGINAL(memoryId, photoId);

        // ALWAYS save to IndexedDB queue first for persistence
        await saveToQueue({
            id: getStoreKey(photoId, relationshipId),
            originalId: photoId, // Keep original for reference
            relationshipId,
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
     * @param {object} bingoOrigin - Optional { categoryId } metadata
     * @returns {Promise<{queued: boolean}>}
     */
    const queueMemory = useCallback(async (formData, photoMetadata, originalCitaId = null, bingoOrigin = null) => {
        const compressedPhotos = await Promise.all(
            photoMetadata.map(async (p, index) => {
                const file = p.file || p;
                
                // First photo (index 0) is always the camera one in Citations
                // We generate a thumbnail for it as requested
                const isMain = index === 0 || !!p.isMain;
                
                if (isMain) {
                    const { blob, thumb } = await processImagePair(file);
                    return { 
                        blob, 
                        thumb,
                        fileName: file.name, 
                        size: blob.size, 
                        mimeType: 'image/webp',
                        isMain: true
                    };
                } else {
                    const blob = await compressImage(file, { maxWidth: 1200, initialQuality: 0.8 });
                    return { 
                        blob, 
                        fileName: file.name, 
                        size: blob.size, 
                        mimeType: 'image/webp',
                        isMain: false
                    };
                }
            })
        );

        const memoryId = generateUUID();

        await saveToQueue({
            id: getStoreKey(memoryId, relationshipId),
            originalId: memoryId,
            relationshipId,
            type: 'memory',
            data: formData,
            photos: compressedPhotos,
            originalCitaId,
            bingoOrigin,
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
        const blob = await compressImage(photoFile, { maxWidth: 1200, initialQuality: 0.8 });

        const snapshotId = generateUUID();

        await saveToQueue({
            id: getStoreKey(snapshotId, relationshipId),
            originalId: snapshotId,
            relationshipId,
            type: 'snapshot',
            data: { message },
            photos: [{ blob, fileName: `${snapshotId}.webp`, size: blob.size, mimeType: 'image/webp' }],
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

    const retryFailedItems = useCallback(async () => {
        if (!relationshipId) return;
        const failed = await getAllFailed(relationshipId);
        for (const item of failed) {
            await updateQueueItem(item.id, { status: 'pending', retryCount: 0 });
        }
        await refreshCount();
        if (navigator.onLine) processQueue();
    }, [refreshCount, processQueue, relationshipId]);

    const clearFailedItems = useCallback(async () => {
        if (!relationshipId) return;
        await clearFailedFromDB(relationshipId);
        await refreshCount();
    }, [refreshCount, relationshipId]);

    /**
     * Gets all snapshots currently in the offline queue.
     */
    const getPendingSnapshots = useCallback(async () => {
        if (!relationshipId) return [];
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => {
                const results = req.result || [];
                resolve(results.filter(item => 
                    item.relationshipId === relationshipId &&
                    item.type === 'snapshot' && 
                    item.status !== 'failed'
                ));
            };
            req.onerror = () => reject(req.error);
        });
    }, [relationshipId]);

    /**
     * Queue a time capsule for offline creation.
     */
    const queueCapsule = useCallback(async (capsuleData, files = []) => {
        if (!relationshipId) {
            return { queued: false };
        }

        const capsuleId = capsuleData.id || generateUUID();
        const isEdit = !!capsuleData.id;
        const compressedFiles = await Promise.all(
            files.map(async (f, idx) => {
                const file = f.file || f;
                // Only compress if it's an image
                const blob = file.type.startsWith('image/') 
                    ? await compressImage(file, { maxWidth: 1200, initialQuality: 0.8 }) 
                    : file;
                
                return {
                    blob,
                    fileName: file.name,
                    mimeType: file.type,
                    size: blob.size
                };
            })
        );

        try {
            await saveToQueue({
                id: getStoreKey(capsuleId, relationshipId),
                originalId: capsuleId,
                existingCapsuleId: isEdit ? capsuleId : null,
                relationshipId,
                type: 'capsule',
                data: capsuleData,
                files: compressedFiles,
                status: 'pending',
                retryCount: 0,
                createdAt: Date.now(),
            });

            await refreshCount();
            
            if (navigator.onLine) {
                processQueue();
            }

            return { queued: true };
        } catch (e) {
            console.error('[useOfflineQueue] Error finishing queueCapsule:', e);
            throw e;
        }
    }, [refreshCount, processQueue, relationshipId]);

    /**
     * Queue a capsule for background deletion.
     */
    const queueDeleteCapsule = useCallback(async (capsuleId) => {
        if (!relationshipId || !capsuleId) return { queued: false };

        const operationId = `delete_${capsuleId}`;
        
        await saveToQueue({
            id: getStoreKey(operationId, relationshipId),
            capsuleId,
            relationshipId,
            type: 'delete-capsule',
            status: 'pending',
            retryCount: 0,
            createdAt: Date.now(),
        });

        await refreshCount();
        if (navigator.onLine) {
            processQueue();
        }

        return { queued: true };
    }, [refreshCount, processQueue, relationshipId]);

    return {
        queueUpload,
        queueMemory,
        queueSnapshot,
        pendingCount,
        failedCount,
        isProcessing,
        processQueue,
        retryItem,
        retryFailedItems,
        clearFailedItems,
        getPendingSnapshots,
        queueCapsule,
        queueDeleteCapsule,
    };
}
