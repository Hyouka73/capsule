import { createContext, useContext, useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useOfflineActions } from '../hooks/useOfflineActions';
import { 
    getBingoBoard, 
    updateBingoBoard as updateBingoBoardApi, 
    resetBingoBoard as resetBingoBoardApi 
} from '../apiClient';
import { toast } from '../components/ui/PastelToast/PastelToast';
import BingoAction from '../models/BingoAction';
import { openDB } from '../config/dbConfig';
import { db } from '../services/firebase';
import { doc, updateDoc, writeBatch, increment, onSnapshot } from 'firebase/firestore';
import { COLLECTIONS } from '../config/constants';

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
    const { relationshipId: rid, user } = useAuth();

    const { queueAction } = useOfflineActions();

    const [celebrationEvent, setCelebrationEvent] = useState(null);
    const [pendingVictory, setPendingVictory] = useState(null);
    const [irisEvent, setIrisEvent] = useState(false);
    
    // UI Queue for offline sync suggestions
    const [bingoQueue, setBingoQueue] = useState([]);
    const [isResolving, setIsResolving] = useState(false);

    // Track active board ID
    const [boardId, setBoardId] = useState('board');
    // Refs for diffing onSnapshot changes locally without triggering infinite renders
    const prevCompletedCountRef = useRef(0);
    const prevRemoteCategoriesRef = useRef([]);
    // Historial local de logros ya mostrados en esta sesión para evitar duplicados al sincronizar
    const seenAchievementsRef = useRef(new Set());

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
                prevCompletedCountRef.current = res.completedCount || 0;
                prevRemoteCategoriesRef.current = cats;
                setTotalCount(res.totalCount || 16);
                if (res.id) setBoardId(res.id);
                // Asegurarse de que IndexedDB guarda el objeto con el id resuelto
                saveBingoCache({...res, id: res.id || 'board'}, rid);
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
                prevCompletedCountRef.current = cached.completedCount || 0;
                prevRemoteCategoriesRef.current = cats;
                setTotalCount(cached.totalCount || 16);
                if (cached.id) setBoardId(cached.id);
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

    // Client-side Achievement Evaluator
    const evaluateBingoBoard = useCallback((cats) => {
        const ROWS = 4;
        const COLS = 4;
        const lines = [];
        for (let r = 0; r < ROWS; r++) {
            let rowFull = true;
            for (let c = 0; c < COLS; c++) {
                if (!cats[r * COLS + c]?.completedMemoryId) { rowFull = false; break; }
            }
            if (rowFull) lines.push({ id: `row_${r}`, type: 'line', label: `Fila ${r + 1} ✅`, coins: 15 });
        }
        for (let c = 0; c < COLS; c++) {
            let colFull = true;
            for (let r = 0; r < ROWS; r++) {
                if (!cats[r * COLS + c]?.completedMemoryId) { colFull = false; break; }
            }
            if (colFull) lines.push({ id: `col_${c}`, type: 'line', label: `Columna ${c + 1} ✅`, coins: 15 });
        }
        if ([0, 5, 10, 15].every(i => cats[i]?.completedMemoryId)) {
            lines.push({ id: 'diag_1', type: 'diagonal', label: 'Diagonal Principal ✅', coins: 15 });
        }
        if ([3, 6, 9, 12].every(i => cats[i]?.completedMemoryId)) {
            lines.push({ id: 'diag_2', type: 'diagonal', label: 'Diagonal Secundaria ✅', coins: 15 });
        }
        const isFullBoard = cats.every(c => c.completedMemoryId);
        return { lines, isFullBoard };
    }, []);

    // Implement onSnapshot for Deferred Celebration
    useEffect(() => {
        if (!rid || !boardId) return;
        const boardRef = doc(db, 'relationships', rid, COLLECTIONS.BINGO_BOARD, boardId);
        
        const unsubscribe = onSnapshot(boardRef, (snapshot) => {
            if (!snapshot.exists()) return;
            // Solo evaluar si es un cambio confirmado por el servidor (no escrituras pendientes locales)
            if (snapshot.metadata.hasPendingWrites || snapshot.metadata.fromCache) return;
            
            const data = snapshot.data();
            const cats = Array.isArray(data.categories) ? data.categories : (Array.isArray(data.squares) ? data.squares : []);
            
            // Detect lines using our evaluator comparing against previous remote state
            const oldEvals = evaluateBingoBoard(prevRemoteCategoriesRef.current);
            const newEvals = evaluateBingoBoard(cats);

            const newLines = newEvals.lines.filter(nl => !oldEvals.lines.find(ol => ol.id === nl.id));
            
            // Detect newly completed special squares
            const newSpecialSquares = cats.filter(c => 
                c.completedMemoryId && 
                c.isSpecial && 
                !prevRemoteCategoriesRef.current.find(oc => oc.id === c.id && oc.completedMemoryId)
            ).map(c => ({
                id: c.id,
                type: 'special_square',
                label: `¡Especial! ${c.title || ''} ⭐`,
                coins: 5
            }));

            let triggeredFullBoard = false;
            let initialAchievements = [];
            let totalCoins = 0;

            if (newLines.length > 0 || newSpecialSquares.length > 0) {
                // Filtrar los que ya vimos localmente durante esta sesión
                const filteredLines = newLines.filter(l => !seenAchievementsRef.current.has(l.id));
                const filteredSpecial = newSpecialSquares.filter(s => !seenAchievementsRef.current.has(s.id));

                if (filteredLines.length > 0 || filteredSpecial.length > 0) {
                    initialAchievements.push(...filteredLines, ...filteredSpecial);
                    totalCoins += initialAchievements.reduce((acc, ach) => acc + ach.coins, 0);
                    
                    // Registrar como vistos
                    initialAchievements.forEach(a => seenAchievementsRef.current.add(a.id));
                }
            }

            if (newEvals.isFullBoard && !oldEvals.isFullBoard && !seenAchievementsRef.current.has('full_board')) {
                triggeredFullBoard = true;
                seenAchievementsRef.current.add('full_board');
                
                const boardVictoryAchievement = { id: 'full_board', type: 'full_board', label: 'Tablero Lleno ⭐️', coins: 50 };
                
                // Si hubo otros logros (líneas/especiales), los mostramos en Fase 1
                if (initialAchievements.length > 0) {
                    setCelebrationEvent({
                        isCombo: initialAchievements.length > 1,
                        achievements: initialAchievements,
                        totalCoins: totalCoins - 50,
                        tierLabel: initialAchievements.length > 1 ? '¡COMBO ÉPICO! 🎊' : initialAchievements[0].label,
                        reward: '¡Tus monedas han sido añadidas! ✨',
                        isFullBoard: false,
                        hasNextPhase: true
                    });
                    setPendingVictory({
                        isCombo: false,
                        achievements: [boardVictoryAchievement],
                        totalCoins: 50,
                        tierLabel: '¡TABLERO COMPLETADO! 🏆',
                        reward: '¡Increíble! Has superado todos los retos de este nivel. ✨',
                        isFullBoard: true
                    });
                } else {
                    // Si solo fue el tablero lleno, igual forzamos la secuencia de dos pasos
                    // Paso 1: Notificación de tablero lleno
                    setCelebrationEvent({
                        isCombo: false,
                        achievements: [boardVictoryAchievement],
                        totalCoins: 0, // Las monedas se entregan en el siguiente paso
                        tierLabel: '¡TABLERO COMPLETADO! 🏆',
                        reward: '¡Increíble! Vamos al tablero para celebrar. ✨',
                        isFullBoard: false,
                        hasNextPhase: true
                    });

                    // Paso 2: La gran victoria con las monedas
                    setPendingVictory({
                        isCombo: false,
                        achievements: [boardVictoryAchievement],
                        totalCoins: 50,
                        tierLabel: '¡VICTORIA TOTAL! ⭐️',
                        reward: 'Has superado todos los desafíos de este nivel. ✨',
                        isFullBoard: true
                    });
                }
            } else if (initialAchievements.length > 0) {
                setCelebrationEvent({
                    isCombo: initialAchievements.length > 1,
                    achievements: initialAchievements,
                    totalCoins: totalCoins,
                    tierLabel: initialAchievements.length > 1 ? '¡COMBO ÉPICO! 🎊' : initialAchievements[0].label,
                    reward: '¡Tus monedas han sido añadidas! ✨',
                    isFullBoard: false
                });
            }

            // Update refs to track current remote state
            prevRemoteCategoriesRef.current = cats;
            prevCompletedCountRef.current = data.completedCount || 0;
            
            setAllCategories(cats);
            setCompletedCount(data.completedCount || 0);

        }, (err) => {
            console.error('[BingoContext] onSnapshot Error:', err);
        });

        return () => unsubscribe();
    }, [rid, boardId, evaluateBingoBoard]);

    const markComplete = useCallback(async (categoryId, memoryId = null) => {
        if (!rid) return { success: false, error: 'Auth required' };
        
        const existing = allCategories.find(c => c.id === categoryId);
        if (!existing) return { success: false, error: 'Categoría no encontrada' };
        if (existing.completedMemoryId) {
            if (existing.isPendingSync) toast.info("Sincronizando con el servidor... ⏳");
            return { success: false, error: 'Casilla ya completada o procesándose' };
        }

        const completedAt = new Date().toISOString();

        // 1. Optimistic Update Local State
        const newCategories = allCategories.map(cat =>
            cat.id === categoryId
                ? { ...cat, completedMemoryId: memoryId || 'pending', completedAt, isPendingSync: true }
                : cat
        );
        const newCompletedCount = completedCount + 1;
        
        setAllCategories(newCategories);
        setCompletedCount(newCompletedCount);

        try {
            // 2. OFFLINE CELEBRATION DETECTION (Instant Feedback)
            const oldEvals = evaluateBingoBoard(allCategories);
            const newEvals = evaluateBingoBoard(newCategories);
            const newLines = newEvals.lines.filter(nl => !oldEvals.lines.find(ol => ol.id === nl.id));
            
            const newlyCompletedCat = newCategories.find(c => c.id === categoryId);
            const isSpecialMatch = newlyCompletedCat?.isSpecial;
            
            let currentAchievements = [...newLines];
            if (isSpecialMatch) {
                currentAchievements.push({
                    id: categoryId,
                    type: 'special_square',
                    label: `¡Especial! ${newlyCompletedCat.title || ''} ⭐`,
                    coins: 5
                });
            } else if (newLines.length === 0) {
                // Si no es especial y no hizo línea, igual mostramos el modal como logro simple
                currentAchievements.push({
                    id: categoryId,
                    type: 'normal_square',
                    label: `¡Reto cumplido! ${newlyCompletedCat.title || ''} ✅`,
                    coins: 0
                });
            }

            const isNewFullBoard = newEvals.isFullBoard && !oldEvals.isFullBoard;
            if (isNewFullBoard) {
                currentAchievements.push({ id: 'full_board', type: 'full_board', label: 'Tablero Lleno ⭐️', coins: 50 });
            }

            // Filtrar repetidos por si acaso y registrar
            const uniqueNewAchievements = currentAchievements.filter(a => !seenAchievementsRef.current.has(a.id));
            
            if (uniqueNewAchievements.length > 0) {
                uniqueNewAchievements.forEach(a => {
                    if (a.id) seenAchievementsRef.current.add(a.id);
                });
                
                const totalCoins = uniqueNewAchievements.reduce((acc, a) => acc + a.coins, 0);
                
                if (isNewFullBoard) {
                    // Force multi-phase sequence for full board victory
                    // Phase 1: The square/combo achievements
                    const phase1Achievements = uniqueNewAchievements.filter(a => a.id !== 'full_board');
                    const phase1Coins = phase1Achievements.reduce((acc, a) => acc + a.coins, 0);
                    
                    setCelebrationEvent({
                        isCombo: phase1Achievements.length > 1,
                        achievements: phase1Achievements,
                        totalCoins: phase1Coins,
                        tierLabel: phase1Achievements.length > 1 ? '¡COMBO ÉPICO! 🎊' : (phase1Achievements[0]?.label || '¡Bien hecho! ✅'),
                        reward: phase1Coins > 0 ? '¡Monedas añadidas! Se validará al conectar ✨' : '¡Sigue así! ✨',
                        isFullBoard: false,
                        hasNextPhase: true
                    });

                    // Prepare Phase 2: Full Board Victory
                    setPendingVictory({
                        id: 'full_board',
                        type: 'full_board',
                        label: 'Tablero Lleno ⭐️',
                        coins: 50,
                        achievements: [{ id: 'full_board', type: 'full_board', label: 'Tablero Lleno ⭐️', coins: 50 }],
                        totalCoins: 50,
                        tierLabel: '¡TABLERO COMPLETADO! 🏆',
                        reward: '¡Increíble! Has superado todos los retos. ✨',
                        isFullBoard: true
                    });
                } else {
                    setCelebrationEvent({
                        isCombo: uniqueNewAchievements.length > 1,
                        achievements: uniqueNewAchievements,
                        totalCoins: totalCoins,
                        tierLabel: uniqueNewAchievements.length > 1 ? '¡COMBO ÉPICO! 🎊' : uniqueNewAchievements[0].label,
                        reward: totalCoins > 0 ? '¡Logro detectado! Se confirmará al sincronizar ✨' : '¡Sigue así para completar el tablero! ✨',
                        isFullBoard: false
                    });
                }
            }

            const isOffline = !navigator.onLine;

            const batch = writeBatch(db);
            const boardRef = doc(db, 'relationships', rid, COLLECTIONS.BINGO_BOARD, boardId);
            
            // Eliminamos la flag isPendingSync para la BD
            const firestoreCategories = newCategories.map(({ isPendingSync, ...rest }) => rest);
            
            batch.update(boardRef, {
                categories: firestoreCategories,
                completedCount: newCompletedCount,
                updatedAt: new Date().toISOString()
            });

            await batch.commit();
            
            if (isOffline) {
                // Toast sutil ya que la celebración grande ya ocurrió o está ocurriendo
                if (uniqueNewAchievements.length === 0) {
                    toast.info('Guardado offline 📱', 'Se validará tu logro cuando tengas conexión');
                }
            } else if (uniqueNewAchievements.length === 0) {
                toast.success('¡Casilla marcada! ✅');
            }
            
            return { success: true };
        } catch (err) {
            toast.error('Error', err.message);
            // Rollback optimistic
            fetchBoard(); 
            return { success: false, error: err.message };
        }
    }, [allCategories, completedCount, rid, boardId, user, evaluateBingoBoard, fetchBoard]);

    const updateBingoBoard = useCallback(async (newCategories) => {
        try {
            setIsLoading(true);
            const res = await updateBingoBoardApi({ 
                boardId,
                boardData: { categories: newCategories } 
            });
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
        
        // --- SECUENCIA VISUAL INMEDIATA ---
        triggerIris(); // Inicia la cortina de transición
        
        // --- RESET OPTIMISTA LOCAL ---
        const resetCategories = allCategories.map(cat => ({
            ...cat,
            completedMemoryId: null,
            completedAt: null,
            isPendingSync: false
        }));
        
        setAllCategories(resetCategories);
        setCompletedCount(0);
        setBingoQueue([]); // Limpiar cola de sugerencias tras reset
        seenAchievementsRef.current.clear(); // Permitir nuevos logros en el siguiente tablero
        
        // Actualizar caché para persistencia inmediata
        saveBingoCache({ 
            id: boardId, 
            categories: resetCategories, 
            completedCount: 0 
        }, rid);
        
        saveBingoQueue([], rid); // Limpiar caché de sugerencias

        try {
            // --- ENCOLAR ACCIÓN OFFLINE ---
            const res = await queueAction('bingo_reset', {});
            
            if (!navigator.onLine) {
                toast.info('Tablero reseteado localmente 🔄', 'Se sincronizará con el servidor al conectar');
            } else {
                // Si estamos online, useOfflineActions ya disparó el proceso en segundo plano
            }
            return { success: true };
        } catch (err) {
            console.error('[BingoContext] Reset Error:', err);
            toast.error('Error al resetear', err.message);
            return { success: false, error: err.message };
        }
    }, [rid, allCategories, boardId, triggerIris, queueAction]);

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
            if (!memoryId || !suggestions?.length) return;
            setBingoQueue(prev => {
                // Deduplicado estricto por memoryId para evitar modales dobles
                if (prev.some(item => item.memoryId === memoryId)) return prev;
                return [...prev, { memoryId, suggestions, createdAt: new Date().toISOString() }];
            });
        }, []),
        resolveBingoSuggestion: useCallback(async (memoryId, selectedCategoryIds = []) => {
            if (isResolving || !memoryId) return;
            setIsResolving(true);
            try {
                if (selectedCategoryIds.length > 0) {
                    // Procesar asíncronamente pero sin bloquear la limpieza de la cola si algo falla
                    for (const catId of selectedCategoryIds) {
                        try {
                            // No esperamos el commit si estamos offline para no bloquear la UI
                            markComplete(catId, memoryId).catch(err => {
                                console.error(`[BingoContext] Async completion error for ${catId}:`, err);
                            });
                        } catch (err) {
                            console.error(`[BingoContext] Sync completion error for ${catId}:`, err);
                        }
                    }
                }
            } finally {
                // Siempre quitamos el item de la cola y quitamos el loading, 
                // permitiendo que el modal se cierre inmediatamente.
                setBingoQueue(prev => prev.filter(item => item.memoryId !== memoryId));
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
