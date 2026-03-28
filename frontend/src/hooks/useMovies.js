/**
 * useMovies.js
 * 
 * Hook para el Tracking de Películas.
 */

import { useCallback, useEffect, useState } from 'react';
import {
    collection,
    query,
    orderBy,
    where,
    onSnapshot,
    getFirestore,
} from 'firebase/firestore';
import { COLLECTIONS } from '../config/constants';
import { toast } from '../components/ui/PastelToast/PastelToast';
import MovieEntry from '../models/MovieEntry';
import { openDB } from '../config/dbConfig';
import { callBackendApi } from '../apiClient';

// ─────────────────────────────────────────────────────────────────────────────
// Caché local de películas en IndexedDB
// ─────────────────────────────────────────────────────────────────────────────

const MOVIES_CACHE_KEY = 'movies_list_cache';

async function saveMoviesCache(movies) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('app_cache', 'readwrite');
            tx.objectStore('app_cache').put({ key: MOVIES_CACHE_KEY, data: movies, savedAt: Date.now() });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch { /* falla silenciosa */ }
}

async function loadMoviesCache() {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction('app_cache', 'readonly');
            const req = tx.objectStore('app_cache').get(MOVIES_CACHE_KEY);
            req.onsuccess = () => resolve(req.result?.data ?? []);
            req.onerror = () => resolve([]);
        });
    } catch { return []; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

const firestoreDb = getFirestore();

export function useMovies() {
    const [movies, setMovies] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let unsubscribe = null;
        setIsLoading(true);

        const init = async () => {
            const cached = await loadMoviesCache();
            if (cached && cached.length > 0) {
                setMovies(cached);
                setIsLoading(false);
            }

            if (navigator.onLine) {
                const memoriesRef = collection(firestoreDb, COLLECTIONS.MEMORIES);
                const q = query(
                    memoriesRef, 
                    where('movieData', '!=', null),
                    orderBy('movieData'),
                    orderBy('eventDate', 'desc')
                );

                unsubscribe = onSnapshot(q, (snap) => {
                    const movieMemories = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    
                    setMovies(movieMemories);
                    saveMoviesCache(movieMemories);
                    setIsLoading(false);
                    setError(null);
                }, (err) => {
                    // silent fail
                    setError(err.message);
                    setIsLoading(false);
                });
            } else {
                setIsLoading(false);
            }
        };

        init();
        return () => unsubscribe?.();
    }, []);

    const addMovie = useCallback(async (movieData) => {
        try {
            const entry = new MovieEntry(movieData);
            const payload = entry.toQueuePayload();

            // Los registros ligeros se guardan directo en Firestore vía BFF
            const memoryPayload = {
                title: payload.title,
                eventDate: payload.watchDate, // MovieEntry usa watchDate YYYY-MM-DD
                movieData: payload,
                placeId: payload.placeId,
                tags: ['Película', 'Cine'],
                isSpecial: payload.rating >= 9
            };

            // Llamada directa al backend
            const response = await callBackendApi('createMemory', memoryPayload);

            if (response.id || response.success) {
                toast.success('¡Película añadida! 🍿', payload.title);
                return { success: true };
            } else {
                throw new Error(response.error || 'Error al guardar');
            }
        } catch (err) {
            // silent fail
            return { success: false, error: err.message };
        }
    }, []);

    const latestMovie = movies[0] || null;

    return {
        movies,
        latestMovie,
        isLoading,
        error,
        addMovie
    };
}
