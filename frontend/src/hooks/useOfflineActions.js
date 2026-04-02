/**
 * useOfflineActions.js
 * 
 * Motor genérico para acciones offline que NO involucran archivos.
 * Maneja operaciones como marcar Bingo, registrar ejercicio, etc.
 * 
 * IndexedDB Store: 'pending_actions' en 'capsule_offline_queue' (misma DB)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getFirestore } from 'firebase/firestore';
import { toast } from '../components/ui/PastelToast/PastelToast';
import { openDB, getStoreKey } from '../config/dbConfig';
import { useAuth } from './useAuth';
import { 
    updateBingoSquare, 
    registerExercise, 
    createMemory,
    redeemCoupon,
    createCoupon
} from '../apiClient';

const ACTION_STORE = 'pending_actions';

async function saveAction(action) {
    if (!action.relationshipId) {
        throw new Error('[useOfflineActions] Cannot save action without relationshipId');
    }
    const db = await openDB();
    const tx = db.transaction(ACTION_STORE, 'readwrite');
    tx.objectStore(ACTION_STORE).put(action);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getPendingActions(relationshipId) {
    if (!relationshipId) return [];
    const db = await openDB();
    const tx = db.transaction(ACTION_STORE, 'readonly');
    const all = await new Promise((resolve, reject) => {
        const req = tx.objectStore(ACTION_STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });

    return all.filter(a => 
        a.relationshipId === relationshipId && 
        (a.status === 'pending' || a.status === 'processing')
    );
}

async function updateAction(id, updates) {
    const db = await openDB();
    const tx = db.transaction(ACTION_STORE, 'readwrite');
    const store = tx.objectStore(ACTION_STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
        if (!getReq.result) return;
        store.put({ ...getReq.result, ...updates });
    };
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function removeAction(id) {
    const db = await openDB();
    const tx = db.transaction(ACTION_STORE, 'readwrite');
    tx.objectStore(ACTION_STORE).delete(id);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Procesadores por tipo de acción
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Procesa una acción de completar casilla de bingo.
 */
async function processBingoCompletion(action) {
    const { categoryId, memoryId, completedAt } = action.payload;
    const { relationshipId } = action;

    await updateBingoSquare({ 
        categoryId, 
        memoryId, 
        completedAt,
        relationshipId 
    });
}

/**
 * Procesa un registro de ejercicio.
 */
async function processExerciseLog(action) {
    const { workoutDate, notes, durationMinutes } = action.payload;
    const { relationshipId } = action;

    await registerExercise({
        workoutDate,
        notes,
        durationMinutes,
        relationshipId
    });
}

/**
 * Procesa un registro de película.
 */
async function processMovieEntry(action) {
    const { title, tmdbId, watchDate, placeId, rating, posterPath, overview } = action.payload;
    const { relationshipId } = action;

    await createMemory({
        title,
        description: overview || `Vimos la película: ${title}`,
        eventDate: watchDate,
        placeId: placeId || null,
        tags: ['movies'],
        movieData: {
            tmdbId,
            rating,
            posterPath,
            title,
        },
        relationshipId,
        photoCount: 0,
        mainPhotoUrl: posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null,
    });
}

/**
 * Procesa un canje de cupón.
 */
async function processCouponRedeem(action) {
    const { couponId, notes } = action.payload;
    const { relationshipId } = action;

    await redeemCoupon({
        couponId,
        notes,
        relationshipId
    });
}

/**
 * Procesa la creación de un cupón (Admin).
 */
async function processCouponCreate(action) {
    const { couponData } = action.payload;
    const { relationshipId } = action;

    await createCoupon({
        ...couponData,
        relationshipId
    });
}

async function dispatchAction(action) {
    switch (action.type) {
        case 'bingo_completion':
            return processBingoCompletion(action);
        case 'exercise_log':
            return processExerciseLog(action);
        case 'movie_entry':
            return processMovieEntry(action);
        case 'coupon_redeem':
            return processCouponRedeem(action);
        case 'create_coupon':
            return processCouponCreate(action);
        default:
            throw new Error(`[offlineActions] Tipo de acción desconocido: ${action.type}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────────────────────────────────────

let isProcessingActionsGlobal = false;

export function useOfflineActions() {
    const { relationshipId } = useAuth();
    const [pendingActionsCount, setPendingActionsCount] = useState(0);
    const [isProcessingActions, setIsProcessingActions] = useState(false);
    const processingRef = useRef(false);

    const refreshActionsCount = useCallback(async () => {
        if (!relationshipId) return;
        try {
            const pending = await getPendingActions(relationshipId);
            setPendingActionsCount(pending.length);
        } catch {
            // Silently handle refresh errors
        }
    }, [relationshipId]);

    const processActions = useCallback(async () => {
        if (!relationshipId || processingRef.current || isProcessingActionsGlobal) return;
        if (!navigator.onLine) {
            refreshActionsCount();
            return;
        }

        const pending = await getPendingActions(relationshipId);
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

                // SECURITY VALIDATION: Skip actions from other relationships
                if (action.relationshipId !== relationshipId) {
                    continue;
                }

                try {
                    await updateAction(action.id, { status: 'processing' });
                    await dispatchAction(action);
                    await removeAction(action.id);
                } catch (err) {
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
    }, [refreshActionsCount, relationshipId]);

    useEffect(() => {
        refreshActionsCount();

        const cleanup = async () => {
            if (!relationshipId) return;
            const pending = await getPendingActions(relationshipId);
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
    }, [processActions, refreshActionsCount, relationshipId]);

    const queueAction = useCallback(async (type, payload) => {
        if (!relationshipId) return { queued: false };
        
        const actionId = crypto.randomUUID();
        await saveAction({
            id: getStoreKey(actionId, relationshipId),
            originalId: actionId,
            relationshipId,
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

        return { queued: true, id: actionId };
    }, [refreshActionsCount, processActions, relationshipId]);

    const queueCoupon = useCallback(async (couponIdOrData, notes = '', isCreate = false) => {
        if (isCreate) {
            return queueAction('create_coupon', { couponData: couponIdOrData });
        }
        return queueAction('coupon_redeem', { couponId: couponIdOrData, notes });
    }, [queueAction]);

    return {
        queueAction,
        pendingActionsCount,
        isProcessingActions,
        processActions,
        queueCoupon,
    };
}
