/**
 * useBingo.js
 * 
 * Hook para el Bingo de Citas.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    doc,
    onSnapshot,
    getFirestore,
} from 'firebase/firestore';
import { useOfflineActions } from './useOfflineActions';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants';
import { toast } from '../components/ui/PastelToast/PastelToast';
import BingoAction from '../models/BingoAction';
import { openDB } from '../config/dbConfig';

// ─────────────────────────────────────────────────────────────────────────────
// Caché local del tablero en IndexedDB
// ─────────────────────────────────────────────────────────────────────────────

const BINGO_CACHE_KEY = 'bingo_board_cache';

async function saveBingoCache(boardData) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('app_cache', 'readwrite');
            tx.objectStore('app_cache').put({ key: BINGO_CACHE_KEY, data: boardData, savedAt: Date.now() });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch { /* falla silenciosa */ }
}

async function loadBingoCache() {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction('app_cache', 'readonly');
            const req = tx.objectStore('app_cache').get(BINGO_CACHE_KEY);
            req.onsuccess = () => resolve(req.result?.data ?? null);
            req.onerror = () => resolve(null);
        });
    } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

const firestoreDb = getFirestore();

export function useBingo() {
    const [categories, setCategories] = useState([]);
    const [completedCount, setCompletedCount] = useState(0);
    const [totalCount, setTotalCount] = useState(20);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const { queueAction } = useOfflineActions();
    const optimisticPending = useRef(new Set());
    const boardRef = doc(firestoreDb, COLLECTIONS.BINGO_BOARD, SINGLETON_DOCS.BINGO_BOARD);

    const applyServerState = useCallback((data) => {
        if (!data) return;

        setCategories(prev => {
            if (optimisticPending.current.size > 0) {
                const merged = (data.categories || []).map(serverCat => {
                    const localCat = prev.find(c => c.id === serverCat.id);
                    if (localCat?.completedMemoryId && !serverCat.completedMemoryId) {
                        return localCat;
                    }
                    return serverCat;
                });
                return merged;
            }
            return data.categories || [];
        });

        setCompletedCount(data.completedCount ?? 0);
        setTotalCount(data.totalCount ?? 20);
        saveBingoCache(data);
    }, []);

    useEffect(() => {
        let unsubscribe = null;
        setIsLoading(true);

        const init = async () => {
            const cached = await loadBingoCache();
            if (cached) {
                applyServerState(cached);
                setIsLoading(false);
            }

            if (navigator.onLine) {
                try {
                    unsubscribe = onSnapshot(
                        boardRef,
                        (snap) => {
                            if (snap.exists()) {
                                applyServerState(snap.data());
                            }
                            setIsLoading(false);
                            setError(null);
                        },
                        (err) => {
                            console.error('[useBingo] Error en snapshot:', err);
                            setError(err.message);
                            setIsLoading(false);
                        }
                    );
                } catch (err) {
                    setError(err.message);
                    setIsLoading(false);
                }
            } else {
                if (!cached) setError('Sin conexión y sin datos guardados localmente.');
                setIsLoading(false);
            }
        };

        init();

        const handleOnline = () => {
            if (!unsubscribe) {
                unsubscribe = onSnapshot(boardRef, (snap) => {
                    if (snap.exists()) applyServerState(snap.data());
                });
            }
        };

        window.addEventListener('online', handleOnline);
        return () => {
            unsubscribe?.();
            window.removeEventListener('online', handleOnline);
        };
    }, [applyServerState, boardRef]);

    const markComplete = useCallback(async (categoryId, memoryId = null) => {
        const existing = categories.find(c => c.id === categoryId);
        if (!existing) return { success: false, error: 'Categoría no encontrada' };
        if (existing.completedMemoryId) return { success: false, error: 'Casilla ya completada' };

        const completedAt = new Date().toISOString();

        // 1. Usar modelo para validación y normalización
        try {
            const action = new BingoAction({ categoryId, memoryId, completedAt });
            const payload = action.toQueuePayload();

            // 2. Actualización optimista en UI
            optimisticPending.current.add(categoryId);
            setCategories(prev =>
                prev.map(cat =>
                    cat.id === categoryId
                        ? { ...cat, completedMemoryId: memoryId || 'pending', completedAt }
                        : cat
                )
            );
            setCompletedCount(prev => prev + 1);

            // 3. Encolar acción
            const { queued, id: actionId } = await queueAction('bingo_completion', payload);

            if (navigator.onLine) {
                toast.success('¡Bingo! 🎉', `Casilla "${existing.label}" marcada`);
            } else {
                toast.info('Guardado offline 📱', 'Se sincronizará cuando tengas conexión');
            }

            setTimeout(() => {
                optimisticPending.current.delete(categoryId);
            }, 10000);

            return { success: true, queued, actionId };
        } catch (err) {
            console.error('[useBingo] Error al encolar acción:', err);
            toast.error('Error', err.message);
            return { success: false, error: err.message };
        }
    }, [categories, queueAction]);

    const isCategoryComplete = useCallback((categoryId) => {
        return categories.find(c => c.id === categoryId)?.completedMemoryId != null;
    }, [categories]);

    const getCategory = useCallback((categoryId) => {
        return categories.find(c => c.id === categoryId) ?? null;
    }, [categories]);

    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return {
        categories,
        completedCount,
        totalCount,
        progressPercent,
        isLoading,
        error,
        markComplete,
        isCategoryComplete,
        getCategory,
    };
}
