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
    const { user } = useAuth();

    const { queueAction } = useOfflineActions();
    const optimisticPending = useRef(new Set());
    const [celebrationEvent, setCelebrationEvent] = useState(null);

    const checkBingoAchievements = useCallback(async (prevCats, nextCats, categoryId) => {
        if (!user) return;
        
        const ROWS = 4;
        const COLS = 5;

        const getLinesCount = (cats) => {
            let lines = 0;
            // Rows (4 rows of 5)
            for (let r = 0; r < ROWS; r++) {
                let rowFull = true;
                for (let c = 0; c < COLS; c++) {
                    if (!cats[r * COLS + c].completedMemoryId) { rowFull = false; break; }
                }
                if (rowFull) lines++;
            }
            // Cols (5 cols of 4)
            for (let c = 0; c < COLS; c++) {
                let colFull = true;
                for (let r = 0; r < ROWS; r++) {
                    if (!cats[r * COLS + c].completedMemoryId) { colFull = false; break; }
                }
                if (colFull) lines++;
            }
            // Diagonals (4 cells each)
            if ([0, 6, 12, 18].every(i => cats[i]?.completedMemoryId)) lines++;
            if ([4, 8, 12, 16].every(i => cats[i]?.completedMemoryId)) lines++;
            
            return lines;
        };

        const prevLines = getLinesCount(prevCats);
        const nextLines = getLinesCount(nextCats);
        const newLines = nextLines - prevLines;
        
        const isBoardFull = nextCats.every(c => c.completedMemoryId);
        const wasBoardFull = prevCats.every(c => c.completedMemoryId);

        let totalCoins = 0;
        let eventToTrigger = null;

        // 1. Line Logic
        if (newLines > 0) {
            totalCoins += newLines * 15;
            eventToTrigger = { 
                tierLabel: newLines > 1 ? '¡MULTIBINGO! 🔥' : '¡LÍNEA COMPLETADA! 🔥', 
                reward: '¡Tus monedas han sido añadidas a tu saldo! ✨', 
                coins: totalCoins 
            };
        }

        // 2. Full Board Logic
        if (isBoardFull && !wasBoardFull) {
            totalCoins += 50;
            eventToTrigger = { 
                tierLabel: '¡TABLERO COMPLETO! 🏆', 
                reward: '¡Increíble! Has completado el board. Admin ha sido avisado. 🎁', 
                coins: totalCoins,
                isFullBoard: true
            };
        }

        // 3. Special Square Logic (+5)
        if (categoryId) {
            const square = nextCats.find(c => c.id === categoryId);
            if (square?.isSpecial) {
                totalCoins += 5;
                if (!eventToTrigger) {
                    eventToTrigger = { 
                        tierLabel: '¡CASILLA ESPECIAL! ✨', 
                        reward: '¡Bono de monedas por casilla especial! 💖', 
                        coins: 5 
                    };
                } else {
                    eventToTrigger.coins = totalCoins;
                    eventToTrigger.reward = `✨ ¡Incluye bono especial! ${eventToTrigger.reward}`;
                }
            }
        }

        if (totalCoins > 0) {
            try {
                const userRef = doc(firestoreDb, COLLECTIONS.USERS, user.uid);
                const trans = {
                    type: "earned",
                    source: isBoardFull && !wasBoardFull ? "bingo_full" : "bingo_line",
                    amount: totalCoins,
                    timestamp: new Date().toISOString()
                };

                await updateDoc(userRef, {
                    gameCoins: increment(totalCoins),
                    coinTransactions: arrayUnion(trans)
                });

                if (isBoardFull && !wasBoardFull) {
                    logActivity({ 
                        type: 'bingoBoardCompleted', 
                        userId: user.uid,
                        timestamp: new Date().toISOString() 
                    });
                }

                setCelebrationEvent(eventToTrigger);
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
                    updatedAt: serverTimestamp()
                });
                
                toast.info('Tablero reseteado 🔄', '¡Es hora de nuevos retos!');
            } catch (err) {
                console.error('[BingoContext] Error resetting board:', err);
                toast.error('Error al resetear board', err.message);
            }
        }, [categories, completedCount, totalCount, user]),
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
