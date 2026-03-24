import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import {
    doc,
    onSnapshot,
    updateDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { db as firestoreDb } from '../services/firebase';
import { useOfflineActions } from '../hooks/useOfflineActions';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants';
import { toast } from '../components/ui/PastelToast/PastelToast';
import BingoAction from '../models/BingoAction';
import { openDB } from '../config/dbConfig';

const BingoContext = createContext();

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

const boardRef = doc(firestoreDb, COLLECTIONS.BINGO_BOARD, SINGLETON_DOCS.BINGO_BOARD);

export function BingoProvider({ children }) {
    const [categories, setCategories] = useState([]);
    const [completedCount, setCompletedCount] = useState(0);
    const [totalCount, setTotalCount] = useState(20);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const { queueAction } = useOfflineActions();
    const optimisticPending = useRef(new Set());
    const [celebrationEvent, setCelebrationEvent] = useState(null);

    const checkBingoAchievements = useCallback((prevCats, nextCats, categoryId) => {
        const size = Math.sqrt(nextCats.length);
        if (!Number.isInteger(size)) {
            console.log('earnPick(tier: 1)');
            return;
        }

        const to2D = (arr) => {
            let m = [];
            for (let i = 0; i < size; i++) m.push(arr.slice(i * size, (i + 1) * size));
            return m;
        };

        const hasFullLine = (cats) => {
            const m = to2D(cats);
            let lines = 0;
            for (let i = 0; i < size; i++) {
                if (m[i].every(c => c.completedMemoryId)) lines++;
                if (m.every(r => r[i].completedMemoryId)) lines++;
            }
            if (m.every((r, i) => r[i].completedMemoryId)) lines++;
            if (m.every((r, i) => r[size - 1 - i].completedMemoryId)) lines++;
            return lines;
        };

        const prevLines = hasFullLine(prevCats);
        const nextLines = hasFullLine(nextCats);
        const isBoardFull = nextCats.every(c => c.completedMemoryId);
        const wasBoardFull = prevCats.every(c => c.completedMemoryId);

        let eventToTrigger = null;

        if (isBoardFull && !wasBoardFull) {
            console.log('earnPick(tier: 3)');
            console.log('bingo_complete');
            eventToTrigger = { tierLabel: '¡Tablero Completo! 🏆', reward: '+1 Pick Oro', coins: 50 };
        } else if (nextLines > prevLines) {
            console.log('earnPick(tier: 2)');
            eventToTrigger = { tierLabel: '¡Línea Completada! 🔥', reward: '+1 Pick Plata', coins: 15 };
        } else {
            console.log('earnPick(tier: 1)');
            eventToTrigger = { tierLabel: '¡Casilla Completada! ✨', reward: '+1 Pick Bronce', coins: 5 };
        }

        if (eventToTrigger) {
            setCelebrationEvent(eventToTrigger);
        }
    }, []);


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
                            console.error('[BingoProvider] Error en snapshot:', err);
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
    }, [applyServerState]);

    const markComplete = useCallback(async (categoryId, memoryId = null) => {
        const existing = categories.find(c => c.id === categoryId);
        if (!existing) return { success: false, error: 'Categoría no encontrada' };
        if (existing.completedMemoryId) return { success: false, error: 'Casilla ya completada' };

        const completedAt = new Date().toISOString();

        try {
            const action = new BingoAction({ categoryId, memoryId, completedAt });
            const payload = action.toQueuePayload();

            optimisticPending.current.add(categoryId);
            setCategories(prev => {
                const nextCats = prev.map(cat =>
                    cat.id === categoryId
                        ? { ...cat, completedMemoryId: memoryId || 'pending', completedAt }
                        : cat
                );
                checkBingoAchievements(prev, nextCats, categoryId);
                return nextCats;
            });
            setCompletedCount(prev => prev + 1);

            const { queued, id: actionId } = await queueAction('bingo_completion', payload);

            if (navigator.onLine) {
                toast.success('¡Bingo! 🎉', `Casilla "${existing.title || existing.label || 'Casilla'}" marcada`);
            } else {
                toast.info('Guardado offline 📱', 'Se sincronizará cuando tengas conexión');
            }

            setTimeout(() => {
                optimisticPending.current.delete(categoryId);
            }, 10000);

            return { success: true, queued, actionId };
        } catch (err) {
            console.error('[BingoProvider] Error al encolar acción:', err);
            toast.error('Error', err.message);
            return { success: false, error: err.message };
        }
    }, [categories, queueAction, checkBingoAchievements]);

    const isCategoryComplete = useCallback((categoryId) => {
        return categories.find(c => c.id === categoryId)?.completedMemoryId != null;
    }, [categories]);

    const isCategoryAvailable = useCallback((categoryId) => {
        return !isCategoryComplete(categoryId);
    }, [isCategoryComplete]);

    const getCategory = useCallback((categoryId) => {
        return categories.find(c => c.id === categoryId) ?? null;
    }, [categories]);

    const updateBingoBoard = useCallback(async (newCategories) => {
        try {
            setIsLoading(true);
            await updateDoc(boardRef, {
                categories: newCategories,
                updatedAt: serverTimestamp()
            });
            toast.success('¡Tablero Guardado! 🎯', 'Los retos han sido actualizados.');
            return { success: true };
        } catch (err) {
            console.error('[BingoProvider] Error al guardar tablero:', err);
            toast.error('Error al guardar', err.message);
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const availableTags = categories.reduce((acc, cat) => {
        const catTags = (cat.suggestedTags || []).map(t => {
            if (typeof t === 'string') return { value: t, label: t.charAt(0).toUpperCase() + t.slice(1) };
            return t; // It's already an object {value, label}
        });
        
        catTags.forEach(tag => {
            if (!acc.find(item => item.value === tag.value)) {
                acc.push(tag);
            }
        });
        return acc;
    }, []);

    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const value = {
        categories,
        availableTags,
        completedCount,
        totalCount,
        progressPercent,
        isLoading,
        error,
        markComplete,
        completeBingoSquare: markComplete,
        isCategoryComplete,
        isCategoryAvailable,
        getCategory,
        updateBingoBoard,
        celebrationEvent,
        clearCelebrationEvent: () => setCelebrationEvent(null)
    };

    return (
        <BingoContext.Provider value={value}>
            {children}
        </BingoContext.Provider>
    );
}

export const useBingoContext = () => {
    const context = useContext(BingoContext);
    if (!context) {
        throw new Error('useBingoContext must be used within a BingoProvider');
    }
    return context;
};
