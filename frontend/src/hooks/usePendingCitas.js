import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { openDB, getStoreKey } from '../config/dbConfig';
import { useAuth } from './useAuth';
import { autoDetectMetadata } from '../utils/extractGpsFromFile';
import { generateUUID } from '../utils/uuid';
const STORE_NAME = 'pending_citas';

export function usePendingCitas() {
    const { relationshipId } = useAuth();
    const [pendingCitas, setPendingCitas] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [optimisticCitas, setOptimisticCitas] = useState([]); // Citations currently being saved
    const hiddenIdsRef = useRef(new Set());
    const removalTimersRef = useRef({});
    const [hiddenTick, setHiddenTick] = useState(0);

    const refreshPending = useCallback(async () => {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const results = request.result || [];
                setPendingCitas(prev => {
                    const urlMap = new Map();
                    prev.forEach(cita => {
                        cita.photos?.forEach(p => {
                            if (p.file && p.objectUrl) urlMap.set(p.file, p.objectUrl);
                        });
                    });

                    return results.map(item => {
                        const photosWithUrls = (item.photos || []).map(p => {
                            if (!p.file) return { ...p, objectUrl: null };
                            const existingUrl = urlMap.get(p.file);
                            return {
                                ...p,
                                objectUrl: existingUrl || URL.createObjectURL(p.file)
                            };
                        });

                        return {
                            ...item,
                            photos: photosWithUrls,
                            coverPhoto: photosWithUrls[0]?.objectUrl
                        };
                    });
                });
                setPendingCount(results.length);
            };

            request.onerror = (e) => {
                console.error('[usePendingCitas] refreshPending IndexedDB Error:', e);
            };
        } catch (err) {
            console.error('[usePendingCitas] refreshPending Try/Catch Error:', err);
        }
    }, []);

    useEffect(() => {
        refreshPending();

        // Listen for background sync completions to refresh UI
        if (window.BroadcastChannel) {
            const channel = new BroadcastChannel('capsule_sync');
            channel.onmessage = (event) => {
                if (event.data?.type === 'SYNC_COMPLETE') {
                    console.log('[usePendingCitas] Sync Complete Event Received');
                    refreshPending();
                }
            };
            return () => channel.close();
        }
    }, [refreshPending, relationshipId]);

    const addPendingCita = useCallback((files, context = null) => {
        const rawId = generateUUID();
        const id = getStoreKey(rawId, relationshipId);
        
        // 1. Create PREVIEW URLS immediately for the optimistic item
        const photosWithUrls = files.map(file => ({
            file,
            name: file.name,
            type: file.type,
            objectUrl: URL.createObjectURL(file)
        }));

        const newItem = {
            id,
            createdAt: Date.now(),
            photos: photosWithUrls,
            coverPhoto: photosWithUrls[0]?.objectUrl,
            status: 'pending',
            isPersisting: true, // Marker for "Saving to local storage..."
            context,
            isFromBingo: context?.type === 'bingo',
            bingoOrigin: context?.type === 'bingo' ? { 
                categoryId: context.categoryId,
                completedAt: new Date().toISOString() // Offline-first: Capturar fecha real de fin de cita
            } : null,
            tags: context?.tags || [],
            description: context?.description || '',
            originalDate: new Date().toLocaleDateString('es-MX', {
                weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
            })
        };

        // 2. Add to optimistic state immediately
        setOptimisticCitas(prev => [newItem, ...prev]);

        // 3. BACKGROUND WORK: Metadata + IDB Persistence
        (async () => {
            try {
                const db = await openDB();
                const persistentItem = { 
                    ...newItem,
                    // Remove transient objectUrls before saving to IDB
                    photos: newItem.photos.map(({ objectUrl, ...rest }) => rest)
                };
                delete persistentItem.coverPhoto;

                // 3a. Metadata Detection
                if (files.length > 0) {
                    try {
                        const metadata = await autoDetectMetadata(files[0]);
                        if (metadata) {
                            if (metadata.lat && metadata.lng) {
                                persistentItem.coordinates = { lat: metadata.lat, lng: metadata.lng };
                            }
                            if (metadata.dateTime) {
                                persistentItem.originalDate = metadata.dateTime.toLocaleDateString('es-MX', {
                                    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                                });
                                persistentItem.rawDate = metadata.dateTime.toISOString();
                            }
                        }
                    } catch (err) {
                        console.warn('[usePendingCitas] Metadata extraction failed:', err);
                    }
                }

                // 3b. IndexedDB Persistence
                await new Promise((resolve, reject) => {
                    const tx = db.transaction(STORE_NAME, 'readwrite');
                    const store = tx.objectStore(STORE_NAME);
                    delete persistentItem.isPersisting; // Remove flag before saving
                    store.add(persistentItem);
                    tx.oncomplete = resolve;
                    tx.onerror = () => reject(tx.error);
                });

                // 3c. Success: Sync state
                refreshPending();
            } catch (err) {
                console.error('[usePendingCitas] Background save failed:', err);
            } finally {
                // Remove from optimistic anyway, refreshPending will bring it back from true store if successful
                setOptimisticCitas(prev => prev.filter(c => c.id !== id));
            }
        })();

        return id;
    }, [refreshPending, relationshipId]);

    const removePendingCita = useCallback(async (id, immediate = false) => {
        if (immediate) {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.delete(id);
                tx.oncomplete = () => {
                    hiddenIdsRef.current.delete(id);
                    setHiddenTick(t => t + 1);
                    refreshPending();
                    resolve();
                };
                tx.onerror = () => reject(tx.error);
            });
        }

        hiddenIdsRef.current.add(id);
        setHiddenTick(t => t + 1);

        const timer = setTimeout(() => {
            removePendingCita(id, true);
            delete removalTimersRef.current[id];
        }, 6000);

        removalTimersRef.current[id] = timer;
    }, [refreshPending]);

    const restorePendingCita = useCallback(async (idOrCita) => {
        const id = typeof idOrCita === 'string' ? idOrCita : idOrCita.id;
        
        if (hiddenIdsRef.current.has(id)) {
            if (removalTimersRef.current[id]) {
                clearTimeout(removalTimersRef.current[id]);
                delete removalTimersRef.current[id];
            }
            hiddenIdsRef.current.delete(id);
            setHiddenTick(t => t + 1);
            return;
        }

        const cita = idOrCita;
        if (typeof cita === 'object') {
            const db = await openDB();
            const cleanedPhotos = (cita.photos || []).map(p => {
                const { objectUrl, ...rest } = p;
                return rest;
            });

            const itemToRestore = {
                ...cita,
                photos: cleanedPhotos,
                status: 'pending'
            };

            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.put(itemToRestore);
                tx.oncomplete = () => {
                    refreshPending();
                    resolve(cita.id);
                };
                tx.onerror = () => reject(tx.error);
            });
        }
    }, [refreshPending]);

    const updatePendingCitaStatus = useCallback(async (id, status) => {
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
    }, [refreshPending]);

    const updatePendingCita = useCallback(async (id, updates) => {
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
    }, [refreshPending]);

    const getActiveDraft = useCallback(async () => {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => {
                const results = request.result || [];
                const active = results.find(c => c.status === 'draft');
                resolve(active || null);
            };
        });
    }, []);

    const saveDraft = useCallback(async (id, data, photos = []) => {
        const db = await openDB();
        const draftId = id || generateUUID();
        const draftItem = {
            id: draftId,
            status: 'draft',
            updatedAt: Date.now(),
            data,
            photos: photos.map(p => ({
                file: p.file || p.blob,
                name: p.name || `photo_${Date.now()}.jpg`,
                type: p.type || 'image/jpeg'
            })),
            isNew: !id
        };

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put(draftItem);
            tx.oncomplete = () => {
                refreshPending();
                resolve(draftId);
            };
            tx.onerror = () => reject(tx.error);
        });
    }, [refreshPending]);

    return useMemo(() => {
        const mergedCitas = [...optimisticCitas, ...pendingCitas].map(cita => ({
            ...cita,
            isHidden: hiddenIdsRef.current.has(cita.id)
        }));

        return {
            pendingCitas: mergedCitas,
            pendingCount: (pendingCount + optimisticCitas.length) - hiddenIdsRef.current.size,
            addPendingCita,
            removePendingCita,
            updatePendingCitaStatus,
            updatePendingCita,
            refreshPending,
            getActiveDraft,
            saveDraft,
            restorePendingCita
        };
    }, [pendingCitas, optimisticCitas, hiddenTick, pendingCount, addPendingCita, removePendingCita, updatePendingCitaStatus, updatePendingCita, refreshPending, getActiveDraft, saveDraft, restorePendingCita]);
}
