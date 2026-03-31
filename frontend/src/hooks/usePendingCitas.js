import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { openDB } from '../config/dbConfig';
import { autoDetectMetadata } from '../utils/extractGpsFromFile';
const STORE_NAME = 'pending_citas';

export function usePendingCitas() {
    const [pendingCitas, setPendingCitas] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
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
                            // REUSE if we already have it, otherwise create
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
        } catch (err) {
            // silent fail
        }
    }, []);

    useEffect(() => {
        refreshPending();
        
        // Listen for background sync completions to refresh UI
        if (window.BroadcastChannel) {
            const channel = new BroadcastChannel('capsule_sync');
            channel.onmessage = (event) => {
                if (event.data?.type === 'SYNC_COMPLETE') {
                    refreshPending();
                }
            };
            return () => channel.close();
        }
    }, [refreshPending]);

    const addPendingCita = useCallback(async (files, context = null) => {
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
            status: 'pending',
            context,
            isFromBingo: context?.type === 'bingo',
            bingoOrigin: context?.type === 'bingo' ? { categoryId: context.categoryId } : null,
            tags: context?.tags || [],
            description: context?.description || ''
        };

        if (files.length > 0) {
            try {
                const metadata = await autoDetectMetadata(files[0]);
                if (metadata) {
                    if (metadata.lat && metadata.lng) {
                        newItem.coordinates = { lat: metadata.lat, lng: metadata.lng };
                    }
                    if (metadata.dateTime) {
                        newItem.originalDate = metadata.dateTime.toLocaleDateString('es-MX', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        newItem.rawDate = metadata.dateTime.toISOString();
                    }
                }
            } catch (err) {
                console.warn('[usePendingCitas] Metadata extraction failed:', err);
            }
        }

        if (!newItem.originalDate) {
            newItem.originalDate = new Date().toLocaleDateString('es-MX', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

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
    }, [refreshPending]);

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
        const draftId = id || crypto.randomUUID();
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

    return useMemo(() => ({
        pendingCitas: pendingCitas.map(cita => ({
            ...cita,
            isHidden: hiddenIdsRef.current.has(cita.id)
        })),
        pendingCount: pendingCount - hiddenIdsRef.current.size,
        addPendingCita,
        removePendingCita,
        updatePendingCitaStatus,
        updatePendingCita,
        refreshPending,
        getActiveDraft,
        saveDraft,
        restorePendingCita
    }), [pendingCitas, hiddenTick, pendingCount, addPendingCita, removePendingCita, updatePendingCitaStatus, updatePendingCita, refreshPending, getActiveDraft, saveDraft, restorePendingCita]);
}
