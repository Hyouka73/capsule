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
    onSnapshot,
    getFirestore,
} from 'firebase/firestore';
import { useOfflineActions } from './useOfflineActions';
import { COLLECTIONS } from '../config/constants';
import { toast } from '../components/ui/PastelToast/PastelToast';
import MovieEntry from '../models/MovieEntry';
import { openDB } from '../config/dbConfig';

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

    const { queueAction } = useOfflineActions();

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
                const moviesRef = collection(firestoreDb, COLLECTIONS.MEMORIES);
                const q = query(
                    moviesRef, 
                    orderBy('eventDate', 'desc')
                );
                // Nota: Filtrar en el cliente por movieData != null si no hay colección de películas dedicada
                // o usar la colección apropiada si existe. Según Flujo 1, las películas se guardan como memories.

                unsubscribe = onSnapshot(q, (snap) => {
                    const allMemories = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    const movieMemories = allMemories.filter(m => m.movieData != null);
                    setMovies(movieMemories);
                    saveMoviesCache(movieMemories);
                    setIsLoading(false);
                    setError(null);
                }, (err) => {
                    console.error('[useMovies] Error:', err);
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

            // Actualización optimista
            const tempId = crypto.randomUUID();
            const optimisticMovie = {
                id: tempId,
                title: payload.title,
                eventDate: payload.watchDate,
                movieData: payload,
                isPending: true
            };

            setMovies(prev => [optimisticMovie, ...prev]);

            // Encolar acción
            const { queued } = await queueAction('movie_entry', payload);

            if (navigator.onLine) {
                toast.success('¡Película añadida! 🍿', payload.title);
            } else {
                toast.info('Guardado offline 📱', 'Se sincronizará cuando tengas conexión');
            }

            return { success: true, queued, tempId };
        } catch (err) {
            toast.error('Error', err.message);
            return { success: false, error: err.message };
        }
    }, [queueAction]);

    const latestMovie = movies[0] || null;

    return {
        movies,
        latestMovie,
        isLoading,
        error,
        addMovie
    };
}
