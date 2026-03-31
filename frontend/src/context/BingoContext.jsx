import { createContext, useContext, useCallback, useEffect, useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useOfflineActions } from '../hooks/useOfflineActions';
import { 
    updateBingoSquare, 
    getBingoBoard, 
    updateBingoBoard as updateBingoBoardApi, 
    resetBingoBoard as resetBingoBoardApi 
} from '../apiClient';
import { toast } from '../components/ui/PastelToast/PastelToast';
import BingoAction from '../models/BingoAction';
import { openDB } from '../config/dbConfig';

const BingoContext = createContext();
const BINGO_CACHE_DB_KEY = 'bingo_board';
const BINGO_QUEUE_DB_KEY = 'bingo_suggestions';

const getBingoCacheKey = (rid) => `bingo_${rid}`;

async function saveBingoCache(boardData, rid) {
    if (!rid) return;
    try {
        const db = await openDB();
        const tx = db.transaction('app_cache', 'readwrite');
        tx.objectStore('app_cache').put({ key: `${BINGO_CACHE_DB_KEY}_${rid}`, data: boardData, savedAt: Date.now() });
    } catch { /* silent */ }
}

async function loadBingoCache(rid) {
    if (!rid) return null;
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction('app_cache', 'readonly');
            const req = tx.objectStore('app_cache').get(`${BINGO_CACHE_DB_KEY}_${rid}`);
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => resolve(null);
        });
    } catch { return null; }
}

async function saveBingoQueue(queue, rid) {
    if (!rid) return;
    try {
        const db = await openDB();
        const tx = db.transaction('app_cache', 'readwrite');
        tx.objectStore('app_cache').put({ key: `${BINGO_QUEUE_DB_KEY}_${rid}`, data: queue, savedAt: Date.now() });
    } catch { /* silent */ }
}

async function loadBingoQueue(rid) {
    if (!rid) return [];
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction('app_cache', 'readonly');
            const req = tx.objectStore('app_cache').get(`${BINGO_QUEUE_DB_KEY}_${rid}`);
            req.onsuccess = () => resolve(req.result?.data ?? []);
            req.onerror = () => resolve([]);
        });
    } catch { return []; }
}

export function BingoProvider({ children }) {
    const [allCategories, setAllCategories] = useState([]);
    const [completedCount, setCompletedCount] = useState(0);
    const [totalCount, setTotalCount] = useState(16);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { relationshipId: rid } = useAuth();

    const { queueAction } = useOfflineActions();

    const [celebrationEvent, setCelebrationEvent] = useState(null);
    const [pendingVictory, setPendingVictory] = useState(null);
    const [irisEvent, setIrisEvent] = useState(false);
    
    // UI Queue for offline sync suggestions
    const [bingoQueue, setBingoQueue] = useState([]);
    const [isResolving, setIsResolving] = useState(false);

    const triggerIris = useCallback(() => {
        setIrisEvent(true);
        setTimeout(() => setIrisEvent(false), 4500);
    }, []);

    const clearCelebrationEvent = useCallback(() => setCelebrationEvent(null), []);

    const fetchBoard = useCallback(async () => {
        if (!rid) return;
        try {
            const res = await getBingoBoard();
            if (res.success) {
                const cats = Array.isArray(res.categories) ? res.categories : (Array.isArray(res.squares) ? res.squares : []);
                setAllCategories(cats);
                setCompletedCount(res.completedCount || 0);
                setTotalCount(res.totalCount || 16);
                saveBingoCache(res, rid);
            }
        } catch (err) {
            // silent fail
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [rid]);

    useEffect(() => {
        if (!rid) return;
        
        let isMounted = true;
        
        const init = async () => {
            const [result, initialQueue] = await Promise.all([
                loadBingoCache(rid),
                loadBingoQueue(rid)
            ]);

            if (!isMounted) return;

            // 1. Cargar lo que haya en IndexedDB (instantáneo!)
            if (result && result.data) {
                const cached = result.data;
                const cats = Array.isArray(cached.categories) ? cached.categories : (Array.isArray(cached.squares) ? cached.squares : []);
                setAllCategories(cats);
                setCompletedCount(cached.completedCount || 0);
                setTotalCount(cached.totalCount || 16);
                setIsLoading(false);
            }

            if (initialQueue.length > 0) {
                setBingoQueue(initialQueue);
            }

            // 2. Background Refresh (Fetch si el cache tiene más de 2 minutos)
            const CACHE_STALE_TIME = 2 * 60 * 1000;
            const isStale = !result || !result.savedAt || (Date.now() - result.savedAt > CACHE_STALE_TIME);
            
            if (navigator.onLine && isStale) {
                fetchBoard();
            } else if (!result) {
                // Si no hay nada, forzar un fetch
                setIsLoading(true);
                fetchBoard();
            }
        };

        init();

        const handleOnline = () => {
            if (isMounted) fetchBoard();
        };

        window.addEventListener('online', handleOnline);
        return () => {
            isMounted = false;
            window.removeEventListener('online', handleOnline);
        };
    }, [rid, fetchBoard]);

    // Persist queue to IndexedDB
    useEffect(() => {
        if (!isLoading && rid) {
            saveBingoQueue(bingoQueue, rid);
        }
    }, [bingoQueue, isLoading, rid]);

    const markComplete = useCallback(async (categoryId, memoryId = null) => {
        if (!rid) return { success: false, error: 'Auth required' };
        
        const existing = allCategories.find(c => c.id === categoryId);
        if (!existing) return { success: false, error: 'Categoría no encontrada' };
        if (existing.completedMemoryId) return { success: false, error: 'Casilla ya completada' };

        const completedAt = new Date().toISOString();

        try {
            // Optimistic Update
            setAllCategories(prev => prev.map(cat =>
                cat.id === categoryId
                    ? { ...cat, completedMemoryId: memoryId || 'pending', completedAt }
                    : cat
            ));
            setCompletedCount(prev => prev + 1);

            // API Call (or queue if offline)
            if (navigator.onLine) {
                const res = await updateBingoSquare({ categoryId, memoryId, completedAt });
                if (res.success) {
                    if (res.newAchievements?.length > 0) {
                        const isFullBoard = !!res.isFullBoard;
                        
                        if (isFullBoard) {
                            // Separar logros: Fase 1 (Lineas/Diagonales) y Fase 2 (Bingo)
                            const initialAchievements = res.newAchievements.filter(a => a.type !== 'full_board');
                            const boardVictoryAchievement = res.newAchievements.find(a => a.type === 'full_board');
                            
                            if (initialAchievements.length > 0) {
                                // Hay logros previos al Bingo (ej: Combo de líneas)
                                setCelebrationEvent({
                                    isCombo: initialAchievements.length > 1,
                                    achievements: initialAchievements,
                                    totalCoins: res.totalCoinsEarned - (boardVictoryAchievement?.coins || 0),
                                    tierLabel: initialAchievements.length > 1 ? '¡COMBO ÉPICO! 🎊' : initialAchievements[0].label,
                                    reward: '¡Tus monedas han sido añadidas! ✨',
                                    isFullBoard: false,
                                    hasNextPhase: true // Indica que sigue el Bingo
                                });
                                // Guardar la Fase 2 para después (Solo el valor del Tablero)
                                setPendingVictory({
                                    isCombo: false,
                                    achievements: [boardVictoryAchievement],
                                    totalCoins: boardVictoryAchievement?.coins || 50,
                                    tierLabel: '¡TABLERO COMPLETADO! 🏆',
                                    reward: '¡Increíble! Has superado todos los retos de este nivel. ✨',
                                    isFullBoard: true
                                });
                            } else {
                                // Solo se completó el tablero (o no hay líneas nuevas)
                                setCelebrationEvent({
                                    isCombo: false,
                                    achievements: [boardVictoryAchievement],
                                    totalCoins: boardVictoryAchievement?.coins || 50,
                                    tierLabel: '¡TABLERO COMPLETADO! 🏆',
                                    reward: '¡Increíble! Has superado todos los retos de este nivel. ✨',
                                    isFullBoard: true
                                });
                            }
                        } else {
                            // Caso normal sin tablero completo
                            setCelebrationEvent({
                                isCombo: res.newAchievements.length > 1,
                                achievements: res.newAchievements,
                                totalCoins: res.totalCoinsEarned,
                                tierLabel: res.newAchievements.length > 1 ? '¡COMBO ÉPICO! 🎊' : res.newAchievements[0].label,
                                reward: '¡Tus monedas han sido añadidas! ✨',
                                isFullBoard: false
                            });
                        }
                    }
                    toast.success('¡Casilla marcada! ✅');
                    fetchBoard(); // Refresh for final state
                }
                return res;
            } else {
                const action = new BingoAction({ categoryId, memoryId, completedAt, relationshipId: rid });
                const { queued, id: actionId } = await queueAction('bingo_completion', action.toQueuePayload());
                toast.info('Guardado offline 📱', 'Se sincronizará cuando tengas conexión');
                return { success: true, queued, actionId };
            }
        } catch (err) {
            // silent fail
            toast.error('Error', err.message);
            fetchBoard(); // Rollback simple
            return { success: false, error: err.message };
        }
    }, [allCategories, rid, queueAction, fetchBoard]);

    const updateBingoBoard = useCallback(async (newCategories) => {
        try {
            setIsLoading(true);
            const res = await updateBingoBoardApi({ categories: newCategories });
            if (res.success) {
                toast.success('¡Tablero Guardado! 🎯');
                fetchBoard();
            }
            return res;
        } catch (err) {
            // silent fail
            toast.error('Error al guardar', err.message);
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, [fetchBoard]);

    const resetBingoBoard = useCallback(async () => {
        if (!rid) return;
        try {
            const res = await resetBingoBoardApi();
            if (res.success) {
                triggerIris();
                toast.info('Tablero reseteado 🔄');
                fetchBoard();
            }
            return res;
        } catch (err) {
            // silent fail
            toast.error('Error al resetear', err.message);
            return { success: false, error: err.message };
        }
    }, [rid, fetchBoard, triggerIris]);

    const triggerFullBoardVictory = useCallback(() => {
        if (pendingVictory) {
            setCelebrationEvent(pendingVictory);
            setPendingVictory(null);
        }
    }, [pendingVictory]);

    const availableTags = useMemo(() => {
        const safeArr = Array.isArray(allCategories) ? allCategories : [];
        return safeArr.reduce((acc, cat) => {
            const catTags = (cat.suggestedTags || []).map(t => {
                if (typeof t === 'string') return { value: t, label: t.charAt(0).toUpperCase() + t.slice(1) };
                return t;
            });
            catTags.forEach(tag => {
                if (!acc.find(item => item.value === tag.value)) acc.push(tag);
            });
            return acc;
        }, []);
    }, [allCategories]);

    const categories = useMemo(() => {
        return allCategories
            .filter(c => c.isEnabled !== false)
            .sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : 0;
                const dateB = b.createdAt ? new Date(b.createdAt) : 0;
                return dateA - dateB;
            })
            .slice(0, 16);
    }, [allCategories]);

    const isCategoryAvailable = useCallback((catId) => {
        const cat = allCategories.find(c => c.id === catId);
        return cat && !cat.completedMemoryId && cat.isEnabled !== false;
    }, [allCategories]);

    const value = {
        categories,
        allCategories,
        availableTags,
        completedCount,
        totalCount,
        progressPercent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
        isLoading,
        error,
        markComplete,
        completeBingoSquare: markComplete,
        isCategoryAvailable,
        updateBingoBoard,
        resetBingoBoard,
        triggerFullBoardVictory,
        celebrationEvent,
        clearCelebrationEvent,
        irisEvent,
        triggerIris,
        bingoQueue,
        isResolving,
        enqueueBingoSuggestion: useCallback((memoryId, suggestions) => {
            setBingoQueue(prev => {
                if (prev.some(item => item.memoryId === memoryId)) return prev;
                return [...prev, { memoryId, suggestions, createdAt: new Date().toISOString() }];
            });
        }, []),
        resolveBingoSuggestion: useCallback(async (memoryId, selectedCategoryIds = []) => {
            if (isResolving) return;
            setIsResolving(true);
            try {
                if (selectedCategoryIds.length > 0) {
                    for (const catId of selectedCategoryIds) {
                        await markComplete(catId, memoryId);
                    }
                }
                setBingoQueue(prev => prev.filter(item => item.memoryId !== memoryId));
            } finally {
                setIsResolving(false);
            }
        }, [isResolving, markComplete])
    };

    return (
        <BingoContext.Provider value={value}>
            {children}
        </BingoContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useBingoContext = () => useContext(BingoContext);
