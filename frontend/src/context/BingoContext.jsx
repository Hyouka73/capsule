import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import {
    doc,
    onSnapshot,
    updateDoc,
    setDoc,
    increment,
    arrayUnion,
    serverTimestamp,
} from 'firebase/firestore';
import { db as firestoreDb } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { useOfflineActions } from '../hooks/useOfflineActions';
import { logActivity } from '../apiClient';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants';
import { toast } from '../components/ui/PastelToast/PastelToast';
import BingoAction from '../models/BingoAction';
import { openDB } from '../config/dbConfig';

const BingoContext = createContext();

const BINGO_CACHE_KEY = 'bingo_board_cache';
const BINGO_QUEUE_KEY = 'capsule_bingoQueue';

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
    const [totalCount, setTotalCount] = useState(16);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth();

    const { queueAction } = useOfflineActions();
    const optimisticPending = useRef(new Set());
    const [celebrationEvent, setCelebrationEvent] = useState(null);
    const [irisEvent, setIrisEvent] = useState(false);
    
    // UI Queue for offline sync suggestions
    const [bingoQueue, setBingoQueue] = useState([]);
    const [isResolving, setIsResolving] = useState(false);

    const triggerIris = useCallback(() => {
        setIrisEvent(true);
        setTimeout(() => setIrisEvent(false), 4500); // Cinematic duration
    }, []);

    const clearCelebrationEvent = useCallback(() => setCelebrationEvent(null), []);

    const checkBingoAchievements = useCallback(async (prevCats, nextCats, categoryId) => {
        if (!user) return;
        
        const ROWS = 4;
        const COLS = 4;

        // 1. Detection Logic
        const getLinesDetails = (cats) => {
            const lines = [];
            // Rows
            for (let r = 0; r < ROWS; r++) {
                let rowFull = true;
                for (let c = 0; c < COLS; c++) {
                    if (!cats[r * COLS + c].completedMemoryId) { rowFull = false; break; }
                }
                if (rowFull) lines.push({ type: 'line', label: `Fila ${r + 1} ✅`, coins: 15 });
            }
            // Cols
            for (let c = 0; c < COLS; c++) {
                let colFull = true;
                for (let r = 0; r < ROWS; r++) {
                    if (!cats[r * COLS + c].completedMemoryId) { colFull = false; break; }
                }
                if (colFull) lines.push({ type: 'line', label: `Columna ${c + 1} ✅`, coins: 15 });
            }
            // Diagonals (4x4 indices: 0,5,10,15 and 3,6,9,12)
            if ([0, 5, 10, 15].every(i => cats[i]?.completedMemoryId)) {
                lines.push({ type: 'diagonal', label: 'Diagonal Principal ✅', coins: 15 });
            }
            if ([3, 6, 9, 12].every(i => cats[i]?.completedMemoryId)) {
                lines.push({ type: 'diagonal', label: 'Diagonal Secundaria ✅', coins: 15 });
            }
            return lines;
        };

        const prevLines = getLinesDetails(prevCats);
        const nextLines = getLinesDetails(nextCats);
        
        // Find NEW lines by filtering those that weren't in prev
        // Using label and type as key
        const newAchievements = nextLines.filter(nl => 
            !prevLines.some(pl => pl.label === nl.label && pl.type === nl.type)
        );

        const isBoardFull = nextCats.every(c => c.completedMemoryId);
        const wasBoardFull = prevCats.every(c => c.completedMemoryId);

        if (isBoardFull && !wasBoardFull) {
            newAchievements.push({ type: 'full_board', label: '¡TABLERO COMPLETO! 🏆', coins: 50 });
        }

        // Special Square Logic (+5)
        if (categoryId) {
            const square = nextCats.find(c => c.id === categoryId);
            const wasSquareComplete = prevCats.find(c => c.id === categoryId)?.completedMemoryId;
            if (square?.isSpecial && !wasSquareComplete) {
                newAchievements.push({ type: 'special', label: 'Casilla Especial ✨', coins: 5 });
            }
        }

        if (newAchievements.length > 0) {
            const totalCoins = newAchievements.reduce((sum, ac) => sum + ac.coins, 0);
            
            try {
                const userRef = doc(firestoreDb, COLLECTIONS.USERS, user.uid);
                
                // Register EACH transaction separately for auditing
                const newTransactions = newAchievements.map(ac => ({
                    type: "earned",
                    source: `bingo_${ac.type}`,
                    label: ac.label,
                    amount: ac.coins,
                    timestamp: new Date().toISOString()
                }));

                await updateDoc(userRef, {
                    gameCoins: increment(totalCoins),
                    coinTransactions: arrayUnion(...newTransactions)
                });

                if (isBoardFull && !wasBoardFull) {
                    logActivity({ 
                        action: 'bingoBoardCompleted', 
                        targetType: 'bingo',
                        targetId: SINGLETON_DOCS.BINGO_BOARD,
                        displayText: '¡Completó el tablero de Bingo! 🎯',
                        metadata: { 
                            userId: user.uid,
                            timestamp: new Date().toISOString() 
                        }
                    });
                }

                // Prepare event for overlay
                setCelebrationEvent({
                    isCombo: newAchievements.length > 1,
                    achievements: newAchievements,
                    totalCoins,
                    tierLabel: newAchievements.length > 1 ? '¡COMBO ÉPICO! 🎊' : newAchievements[0].label,
                    reward: isBoardFull && !wasBoardFull ? '¡Tablero completado! Se reseteará automáticamente.' : '¡Tus monedas han sido añadidas! ✨',
                    isFullBoard: isBoardFull && !wasBoardFull
                });
            } catch (err) {
                console.error('[BingoContext] Error updating rewards:', err);
            }
        }
    }, [user]);


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
        let isMounted = true;
        let unsubscribe = null;
        setIsLoading(true);

        const init = async () => {
            const cached = await loadBingoCache();
            if (!isMounted) return;

            if (cached) {
                applyServerState(cached);
                setIsLoading(false);
            }

            // Hydrate Queue from localStorage
            try {
                const savedQueue = localStorage.getItem(BINGO_QUEUE_KEY);
                if (savedQueue) {
                    const parsed = JSON.parse(savedQueue);
                    setBingoQueue(parsed);
                }
            } catch (err) {
                console.error('[BingoProvider] Error hydrating queue:', err);
            }

            if (navigator.onLine) {
                try {
                    // One last check before setting the listener
                    if (!isMounted) return;

                    unsubscribe = onSnapshot(
                        boardRef,
                        (snap) => {
                            if (!isMounted) return;
                            if (snap.exists()) {
                                applyServerState(snap.data());
                            }
                            setIsLoading(false);
                            setError(null);
                        },
                        (err) => {
                            if (!isMounted) return;
                            console.error('[BingoProvider] Error en snapshot:', err);
                            setError(err.message);
                            setIsLoading(false);
                        }
                    );

                    // If we unmounted exactly while calling onSnapshot
                    if (!isMounted) {
                        unsubscribe?.();
                        unsubscribe = null;
                    }
                } catch (err) {
                    if (isMounted) {
                        setError(err.message);
                        setIsLoading(false);
                    }
                }
            } else {
                if (isMounted) {
                    if (!cached) setError('Sin conexión y sin datos guardados localmente.');
                    setIsLoading(false);
                }
            }
        };

        init();

        const handleOnline = () => {
            if (!isMounted) return;
            if (!unsubscribe) {
                unsubscribe = onSnapshot(boardRef, (snap) => {
                    if (!isMounted) return;
                    if (snap.exists()) applyServerState(snap.data());
                });
                if (!isMounted) unsubscribe?.();
            }
        };

        window.addEventListener('online', handleOnline);
        return () => {
            isMounted = false;
            unsubscribe?.();
            window.removeEventListener('online', handleOnline);
        };
    }, [applyServerState]);

    // Persist queue changes
    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem(BINGO_QUEUE_KEY, JSON.stringify(bingoQueue));
        }
    }, [bingoQueue, isLoading]);

    // Thorough zombie filter once categories are loaded
    useEffect(() => {
        if (categories.length > 0 && bingoQueue.length > 0) {
            setBingoQueue(prev => prev.filter(item => {
                // Keep if at least one suggested category is NOT yet completed in current state
                return item.suggestions.some(s => {
                    const cat = categories.find(c => c.id === s.categoryId);
                    return cat && !cat.completedMemoryId;
                });
            }));
        }
    }, [categories]); // Only run when categories change (e.g. after sync)

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
                toast.success('¡Casilla marcada! ✅', `Reto "${existing.title || existing.label || 'Reto'}" logrado`);
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

    const markBatchComplete = useCallback(async (categoryIds, memoryId = null) => {
        if (!categoryIds || categoryIds.length === 0) return;
        
        const completedAt = new Date().toISOString();
        const existingCats = categories;
        
        try {
            optimisticPending.current = new Set([...optimisticPending.current, ...categoryIds]);
            
            setCategories(prev => {
                const nextCats = prev.map(cat => 
                    categoryIds.includes(cat.id)
                        ? { ...cat, completedMemoryId: memoryId || 'pending', completedAt }
                        : cat
                );
                // Trigger achievements ONCE for the whole batch
                checkBingoAchievements(prev, nextCats, categoryIds[0]); 
                return nextCats;
            });
            
            setCompletedCount(prev => prev + categoryIds.length);

            // Queue each one
            for (const catId of categoryIds) {
                const action = new BingoAction({ categoryId: catId, memoryId, completedAt });
                queueAction('bingo_completion', action.toQueuePayload());
            }

            toast.success('¡Retos completados! ✨', `Has logrado ${categoryIds.length} casillas`);
            
            setTimeout(() => {
                categoryIds.forEach(id => optimisticPending.current.delete(id));
            }, 10000);

            return { success: true };
        } catch (err) {
            console.error('[BingoProvider] Error in batch mark:', err);
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

    const enqueueBingoSuggestion = useCallback((memoryId, suggestions) => {
        if (!memoryId || !suggestions?.length) return;

        setBingoQueue(prev => {
            if (prev.some(item => item.memoryId === memoryId)) return prev;
            return [...prev, { 
                memoryId, 
                suggestions, 
                createdAt: new Date().toISOString() 
            }];
        });
    }, []);

    const resolveBingoSuggestion = useCallback(async (memoryId, selectedCategoryIds = []) => {
        if (isResolving) return;
        setIsResolving(true);

        try {
            if (selectedCategoryIds.length > 0) {
                await markBatchComplete(selectedCategoryIds, memoryId);
            }

            // Remove from queue
            setBingoQueue(prev => prev.filter(item => item.memoryId !== memoryId));
        } catch (err) {
            console.error('[BingoProvider] Error resolving suggestion:', err);
            toast.error('Error', 'No se pudo procesar la sugerencia.');
        } finally {
            setIsResolving(false);
        }
    }, [isResolving, markBatchComplete]);

    const value = {
        categories,
        availableTags,
        completedCount,
        totalCount,
        progressPercent,
        isLoading,
        error,
        markBatchComplete,
        markComplete,
        completeBingoSquare: markComplete,
        isCategoryComplete,
        isCategoryAvailable,
        getCategory,
        updateBingoBoard,
        resetBingoBoard: useCallback(async () => {
            if (!categories.length) return;
            
            // 1. Archive current board
            try {
                const historyId = `${SINGLETON_DOCS.BINGO_BOARD}_${Date.now()}`;
                await setDoc(doc(firestoreDb, COLLECTIONS.BINGO_HISTORY, historyId), {
                    categories,
                    completedCount,
                    totalCount,
                    archivedAt: new Date().toISOString(),
                    userId: user?.uid
                });

                // 2. Clear current board
                const resetCats = categories.map(c => ({
                    ...c,
                    completedMemoryId: null,
                    completedAt: null
                }));
                
                await updateDoc(boardRef, {
                    categories: resetCats,
                    completedCount: 0,
                    updatedAt: serverTimestamp()
                });
                
                // Cinematic Iris Transition
                triggerIris();
                
                toast.info('Tablero reseteado 🔄', '¡Es hora de nuevos retos!');
            } catch (err) {
                console.error('[BingoContext] Error resetting board:', err);
                toast.error('Error al resetear board', err.message);
            }
        }, [categories, completedCount, totalCount, user, triggerIris]),
        celebrationEvent,
        clearCelebrationEvent: () => setCelebrationEvent(null),
        irisEvent,
        triggerIris,
        bingoQueue,
        isResolving,
        enqueueBingoSuggestion,
        resolveBingoSuggestion
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
