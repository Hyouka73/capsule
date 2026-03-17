import { useState, useEffect, useCallback, useMemo } from 'react';

import { openDB } from '../config/dbConfig';
import { autoDetectMetadata } from '../utils/extractGpsFromFile';
const STORE_NAME = 'pending_citas';

export function usePendingCitas() {
    const [pendingCitas, setPendingCitas] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [hiddenIds, setHiddenIds] = useState(new Set());
    const [removalTimers, setRemovalTimers] = useState({});

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
            status: 'pending',
            context
        };

        // Try to extract metadata from the first photo
        if (files.length > 0) {
            try {
                const metadata = await autoDetectMetadata(files[0]);
                if (metadata) {
                    console.log('[usePendingCitas] Metadata detected for new cita:', metadata);
                    if (metadata.lat && metadata.lng) {
                        newItem.coordinates = { lat: metadata.lat, lng: metadata.lng };
                    }
                    if (metadata.dateTime) {
                        // Use a readable format for the UI
                        newItem.originalDate = metadata.dateTime.toLocaleDateString('es-MX', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        // Also store the raw ISO for the form date input
                        newItem.rawDate = metadata.dateTime.toISOString();
                    }
                }
            } catch (err) {
                console.warn('[usePendingCitas] Metadata extraction failed:', err);
            }
        }

        // Fallback for date if not extracted
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
    };

    const removePendingCita = async (id, immediate = false) => {
        if (immediate) {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.delete(id);
                tx.oncomplete = () => {
                    setHiddenIds(prev => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                    });
                    refreshPending();
                    resolve();
                };
                tx.onerror = () => reject(tx.error);
            });
        }

        // --- Soft Delete (The User's Idea) ---
        setHiddenIds(prev => new Set(prev).add(id));
        
        // Schedule final deletion
        const timer = setTimeout(() => {
            removePendingCita(id, true);
            setRemovalTimers(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }, 6000);

        setRemovalTimers(prev => ({ ...prev, [id]: timer }));
    };

    const restorePendingCita = async (idOrCita) => {
        const id = typeof idOrCita === 'string' ? idOrCita : idOrCita.id;
        
        // If it was just hidden, just show it back
        if (hiddenIds.has(id)) {
            if (removalTimers[id]) {
                clearTimeout(removalTimers[id]);
                setRemovalTimers(prev => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
            }
            setHiddenIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
            return;
        }

        // If it was already gone (legacy/fallback), perform real restoration
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
                store.add(itemToRestore);
                tx.oncomplete = () => {
                    refreshPending();
                    resolve(cita.id);
                };
                tx.onerror = () => reject(tx.error);
            });
        }
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

    /**
     * Finds the most recent unfinished draft.
     */
    const getActiveDraft = useCallback(async () => {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => {
                const results = request.result || [];
                // A draft is an item that hasn't been "queued" for upload yet
                const active = results.find(c => c.status === 'draft');
                resolve(active || null);
            };
        });
    }, []);

    /**
     * Creates or updates a draft with current form data and photos.
     */
    const saveDraft = async (id, data, photos = []) => {
        const db = await openDB();
        const draftId = id || crypto.randomUUID();
        const draftItem = {
            id: draftId,
            status: 'draft',
            updatedAt: Date.now(),
            data, // stores title, tags, place info, etc.
            photos: photos.map(p => ({
                file: p.file || p.blob, // Blob to be stored in physical memory
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
    };

    return useMemo(() => ({
        pendingCitas: pendingCitas.filter(c => !hiddenIds.has(c.id)),
        pendingCount: pendingCount - hiddenIds.size,
        addPendingCita,
        removePendingCita,
        updatePendingCitaStatus,
        updatePendingCita,
        refreshPending,
        getActiveDraft,
        saveDraft,
        restorePendingCita
    }), [pendingCitas, hiddenIds, pendingCount, addPendingCita, removePendingCita, updatePendingCitaStatus, updatePendingCita, refreshPending, getActiveDraft, saveDraft, restorePendingCita]);
}
