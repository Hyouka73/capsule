/**
 * useOfflineActions.js
 * 
 * Motor genérico para acciones offline que NO involucran archivos.
 * Maneja operaciones como marcar Bingo, registrar ejercicio, etc.
 * 
 * Separado de useOfflineQueue (que maneja fotos/blobs) para evitar
 * inflar ese hook con lógica de Firestore pura.
 * 
 * IndexedDB Store: 'pending_actions' en 'capsule_offline_queue' (misma DB)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    doc,
    updateDoc,
    setDoc,
    getDoc,
    arrayUnion,
    increment,
    serverTimestamp,
    getFirestore,
    collection,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { toast } from '../components/ui/PastelToast/PastelToast';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants';

// ─────────────────────────────────────────────────────────────────────────────
// IndexedDB — reutiliza la misma DB que useOfflineQueue
// ─────────────────────────────────────────────────────────────────────────────

import { openDB } from '../config/dbConfig';
const ACTION_STORE = 'pending_actions';

async function saveAction(action) {
    const db = await openActionsDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(ACTION_STORE, 'readwrite');
        tx.objectStore(ACTION_STORE).put(action);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getPendingActions() {
    const db = await openActionsDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(ACTION_STORE, 'readonly');
        const req = tx.objectStore(ACTION_STORE).getAll();
        req.onsuccess = () => {
            const all = req.result || [];
            resolve(all.filter(a => a.status === 'pending' || a.status === 'processing'));
        };
        req.onerror = () => reject(req.error);
    });
}

async function updateAction(id, updates) {
    const db = await openActionsDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(ACTION_STORE, 'readwrite');
        const store = tx.objectStore(ACTION_STORE);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
            if (!getReq.result) return;
            store.put({ ...getReq.result, ...updates });
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function removeAction(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(ACTION_STORE, 'readwrite');
        tx.objectStore(ACTION_STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Procesadores por tipo de acción
// ─────────────────────────────────────────────────────────────────────────────

const db = getFirestore();

/**
 * Procesa una acción de completar casilla de bingo.
 */
async function processBingoCompletion(action) {
    const { categoryId, memoryId, completedAt } = action.payload;

    const boardRef = doc(db, COLLECTIONS.BINGO_BOARD, SINGLETON_DOCS.BINGO_BOARD);
    const boardSnap = await getDoc(boardRef);

    if (!boardSnap.exists()) {
        throw new Error(`[offlineActions] bingoBoard/${SINGLETON_DOCS.BINGO_BOARD} no existe`);
    }

    const boardData = boardSnap.data();
    const categories = boardData.categories || [];

    const updatedCategories = categories.map(cat => {
        if (cat.id === categoryId && !cat.completedMemoryId) {
            return {
                ...cat,
                completedMemoryId: memoryId || null,
                completedAt: completedAt || new Date().toISOString(),
            };
        }
        return cat;
    });

    const newCompletedCount = updatedCategories.filter(c => c.completedMemoryId).length;

    await updateDoc(boardRef, {
        categories: updatedCategories,
        completedCount: newCompletedCount,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Procesa un registro de ejercicio.
 */
async function processExerciseLog(action) {
    const { workoutDate, notes, durationMinutes } = action.payload; // Quitamos userId del payload, lo sacamos del auth
    const auth = getAuth();
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('[processExerciseLog] No hay usuario autenticado.');

    const trackingRef = doc(db, 'exerciseTracking', userId);
    const snap = await getDoc(trackingRef);

    const today = new Date(workoutDate + 'T00:00:00');
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString().split('T')[0];

    const newEntry = {
        date: todayISO,
        notes: notes || '',
        durationMinutes: durationMinutes || 0,
        loggedAt: new Date().toISOString(),
    };

    if (!snap.exists()) {
        await setDoc(trackingRef, {
            currentStreak: 1,
            longestStreak: 1,
            totalDays: 1,
            lastWorkoutDate: todayISO,
            unlockedTiers: [],
            workoutLog: [newEntry],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return;
    }

    const data = snap.data();
    const workoutLog = data.workoutLog || [];

    const alreadyLogged = workoutLog.some(entry => entry.date === todayISO);
    if (alreadyLogged) {
        console.log('[offlineActions] Workout ya registrado para', todayISO);
        return;
    }

    const lastDate = data.lastWorkoutDate
        ? new Date(data.lastWorkoutDate + 'T00:00:00')
        : null;

    let newStreak = 1;
    if (lastDate) {
        const diffDays = Math.round((today - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
            newStreak = (data.currentStreak || 0) + 1;
        } else if (diffDays === 0) {
            newStreak = data.currentStreak || 1;
        }
    }

    const newLongest = Math.max(newStreak, data.longestStreak || 0);

    await updateDoc(trackingRef, {
        currentStreak: newStreak,
        longestStreak: newLongest,
        totalDays: increment(1),
        lastWorkoutDate: todayISO,
        workoutLog: arrayUnion(newEntry),
        updatedAt: serverTimestamp(),
    });
}

/**
 * Procesa un registro de película.
 * Crea un nuevo documento en la colección 'memories' con los datos de la película.
 */
async function processMovieEntry(action) {
    const { title, tmdbId, watchDate, placeId, rating, posterPath, overview } = action.payload;
    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('[processMovieEntry] No hay usuario autenticado.');

    const memoriesRef = collection(db, COLLECTIONS.MEMORIES);
    const newMemoryRef = doc(memoriesRef);

    await setDoc(newMemoryRef, {
        id: newMemoryRef.id,
        title,
        description: overview || `Vimos la película: ${title}`,
        eventDate: watchDate,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        placeId: placeId || null,
        tags: ['movies'],
        movieData: {
            tmdbId,
            rating,
            posterPath,
            title,
        },
        uploadedBy: uid,
        photoCount: 0,
        mainPhotoUrl: posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null,
        isHidden: false,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher principal
// ─────────────────────────────────────────────────────────────────────────────

async function dispatchAction(action) {
    switch (action.type) {
        case 'bingo_completion':
            return processBingoCompletion(action);
        case 'exercise_log':
            return processExerciseLog(action);
        case 'movie_entry':
            return processMovieEntry(action);
        default:
            throw new Error(`[offlineActions] Tipo de acción desconocido: ${action.type}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────────────────────────────────────

let isProcessingActionsGlobal = false;

export function useOfflineActions() {
    const [pendingActionsCount, setPendingActionsCount] = useState(0);
    const [isProcessingActions, setIsProcessingActions] = useState(false);
    const processingRef = useRef(false);

    const refreshActionsCount = useCallback(async () => {
        try {
            const pending = await getPendingActions();
            setPendingActionsCount(pending.length);
        } catch {
            // IndexedDB no disponible
        }
    }, []);

    const processActions = useCallback(async () => {
        if (processingRef.current || isProcessingActionsGlobal) return;
        if (!navigator.onLine) {
            refreshActionsCount();
            return;
        }

        const pending = await getPendingActions();
        if (pending.length === 0) {
            refreshActionsCount();
            return;
        }

        processingRef.current = true;
        isProcessingActionsGlobal = true;
        setIsProcessingActions(true);

        try {
            pending.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

            for (const action of pending) {
                if (!navigator.onLine) break;

                try {
                    await updateAction(action.id, { status: 'processing' });
                    await dispatchAction(action);
                    await removeAction(action.id);
                    console.log(`[offlineActions] ✅ ${action.type} procesado:`, action.id);
                } catch (err) {
                    console.error(`[offlineActions] ❌ ${action.type} falló:`, err);
                    const retries = (action.retryCount ?? 0) + 1;
                    if (retries >= 3) {
                        await updateAction(action.id, { status: 'failed', retryCount: retries });
                    } else {
                        await updateAction(action.id, { status: 'pending', retryCount: retries });
                    }
                }
            }
        } finally {
            processingRef.current = false;
            isProcessingActionsGlobal = false;
            setIsProcessingActions(false);
            refreshActionsCount();
        }
    }, [refreshActionsCount]);

    useEffect(() => {
        refreshActionsCount();

        const cleanup = async () => {
            const pending = await getPendingActions();
            const stuck = pending.filter(a => a.status === 'processing');
            for (const action of stuck) {
                await updateAction(action.id, { status: 'pending' });
            }
            if (navigator.onLine) processActions();
        };
        cleanup();

        const handleOnline = () => processActions();
        const handleVisibility = () => {
            if (document.visibilityState === 'visible' && navigator.onLine) processActions();
        };
        const heartbeat = setInterval(() => {
            if (navigator.onLine) processActions();
        }, 120000);

        window.addEventListener('online', handleOnline);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.removeEventListener('online', handleOnline);
            document.removeEventListener('visibilitychange', handleVisibility);
            clearInterval(heartbeat);
        };
    }, [processActions, refreshActionsCount]);

    const queueAction = useCallback(async (type, payload) => {
        const id = crypto.randomUUID();
        await saveAction({
            id,
            type,
            payload,
            status: 'pending',
            retryCount: 0,
            createdAt: Date.now(),
        });
        await refreshActionsCount();

        if (navigator.onLine) {
            processActions();
        }

        return { queued: true, id };
    }, [refreshActionsCount, processActions]);

    return {
        queueAction,
        pendingActionsCount,
        isProcessingActions,
        processActions,
    };
}
