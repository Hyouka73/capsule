/**
 * useExercise.js
 * 
 * Hook para Exercise Streaks con soporte offline completo.
 */

import { useCallback, useEffect, useState } from 'react';
import {
    doc,
    onSnapshot,
    getFirestore,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useOfflineActions } from './useOfflineActions';
import { toast } from '../components/ui/PastelToast/PastelToast';
import ExerciseLog from '../models/ExerciseLog';
import { openDB } from '../config/dbConfig';

// ─────────────────────────────────────────────────────────────────────────────
// Caché local del estado de ejercicio
// ─────────────────────────────────────────────────────────────────────────────

const EXERCISE_CACHE_PREFIX = 'exercise_cache_';

async function saveExerciseCache(userId, data) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('app_cache', 'readwrite');
            tx.objectStore('app_cache').put({
                key: EXERCISE_CACHE_PREFIX + userId,
                data,
                savedAt: Date.now(),
            });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch { /* falla silenciosa */ }
}

async function loadExerciseCache(userId) {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction('app_cache', 'readonly');
            const req = tx.objectStore('app_cache').get(EXERCISE_CACHE_PREFIX + userId);
            req.onsuccess = () => resolve(req.result?.data ?? null);
            req.onerror = () => resolve(null);
        });
    } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lógica de racha
// ─────────────────────────────────────────────────────────────────────────────

function calculateNewStreakState(currentState, workoutDate) {
    const today = new Date(workoutDate + 'T00:00:00');
    const todayISO = today.toISOString().split('T')[0];
    const workoutLog = currentState.workoutLog || [];

    if (workoutLog.some(e => e.date === todayISO)) return currentState;

    const lastDate = currentState.lastWorkoutDate
        ? new Date(currentState.lastWorkoutDate + 'T00:00:00')
        : null;

    let newStreak = 1;
    if (lastDate) {
        const diffDays = Math.round((today - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
            newStreak = (currentState.currentStreak || 0) + 1;
        } else if (diffDays === 0) {
            newStreak = currentState.currentStreak || 1;
        }
    }

    const newLongest = Math.max(newStreak, currentState.longestStreak || 0);
    const newTotal = (currentState.totalDays || 0) + 1;

    return {
        ...currentState,
        currentStreak: newStreak,
        longestStreak: newLongest,
        totalDays: newTotal,
        lastWorkoutDate: todayISO,
        workoutLog: [
            ...workoutLog,
            {
                date: todayISO,
                notes: '',
                durationMinutes: 0,
                loggedAt: new Date().toISOString(),
                isPending: true,
            },
        ],
    };
}

function checkStreakAtRisk(state) {
    if (!state.lastWorkoutDate || state.currentStreak < 2) return false;
    const lastDate = new Date(state.lastWorkoutDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today - lastDate) / (1000 * 60 * 60 * 24));
    return diffDays === 1;
}

function checkAlreadyLoggedToday(state) {
    if (!state.lastWorkoutDate) return false;
    const todayISO = new Date().toISOString().split('T')[0];
    return state.lastWorkoutDate === todayISO;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

const firestoreDb = getFirestore();

export function useExercise() {
    const auth = getAuth();
    const userId = auth.currentUser?.uid;

    const [state, setState] = useState({
        currentStreak: 0,
        longestStreak: 0,
        totalDays: 0,
        lastWorkoutDate: null,
        unlockedTiers: [],
        workoutLog: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const { queueAction } = useOfflineActions();

    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            return;
        }

        let unsubscribe = null;
        const init = async () => {
            const cached = await loadExerciseCache(userId);
            if (cached) {
                setState(cached);
                setIsLoading(false);
            }

            if (navigator.onLine) {
                const trackingRef = doc(firestoreDb, 'exerciseTracking', userId);
                unsubscribe = onSnapshot(trackingRef, (snap) => {
                    if (snap.exists()) {
                        const data = snap.data();
                        const normalized = {
                            ...data,
                            lastWorkoutDate: data.lastWorkoutDate || null,
                            unlockedTiers: data.unlockedTiers || [],
                            workoutLog: (data.workoutLog || []).map(entry => ({ ...entry, isPending: false })),
                        };
                        setState(normalized);
                        saveExerciseCache(userId, normalized);
                    }
                    setIsLoading(false);
                    setError(null);
                }, (err) => {
                    setError(err.message);
                    setIsLoading(false);
                });
            } else {
                setIsLoading(false);
            }
        };

        init();
        return () => unsubscribe?.();
    }, [userId]);

    const logWorkout = useCallback(async ({
        date = new Date().toISOString().split('T')[0],
        notes = '',
        durationMinutes = 0,
    } = {}) => {
        if (!userId) return { success: false, error: 'No user' };

        if (checkAlreadyLoggedToday(state)) {
            toast.info('¡Ya registraste hoy! 💪', 'Tu racha sigue en marcha');
            return { success: false, reason: 'already_logged' };
        }

        try {
            // 1. Validar con modelo
            const logModel = new ExerciseLog({ userId, workoutDate: date, notes, durationMinutes });
            const payload = logModel.toQueuePayload();

            // 2. Optimistic update
            const newState = calculateNewStreakState(state, date);
            setState(newState);
            await saveExerciseCache(userId, newState);

            // 3. Queue Action
            const { queued } = await queueAction('exercise_log', payload);

            const streakMsg = newState.currentStreak > 1
                ? `¡${newState.currentStreak} días seguidos! 🔥`
                : '¡Primer día de tu nueva racha! 💪';

            if (navigator.onLine) {
                toast.success('Workout registrado', streakMsg);
            } else {
                toast.info('Guardado offline 📱', 'Se sincronizará cuando tengas conexión');
            }

            return { success: true, newStreak: newState.currentStreak, queued };
        } catch (err) {
            toast.error('Error', err.message);
            return { success: false, error: err.message };
        }
    }, [userId, state, queueAction]);

    return {
        ...state,
        isLoading,
        error,
        alreadyLoggedToday: checkAlreadyLoggedToday(state),
        streakAtRisk: checkStreakAtRisk(state),
        hasPendingSync: state.workoutLog?.some(e => e.isPending) ?? false,
        logWorkout,
    };
}
