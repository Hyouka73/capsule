import { useState, useEffect } from 'react';
import { subscribeToCollection } from '../../../services/firestore';
import { COLLECTIONS } from '../../../config/constants';
import Place from '../../../models/Place';

/**
 * Hook to manage real-time subscription to Places collection.
 * Replaces MOCK_PLACES with real data from Firestore.
 * 
 * @returns {Object} { places: Array, loading: boolean, error: Error|null }
 */
let globalPlacesCache = [];
let globalLoading = true;
let globalUnsubscribe = null;
let listeners = new Set();

export function usePlaces() {
    const [places, setPlaces] = useState(globalPlacesCache);
    const [loading, setLoading] = useState(globalLoading);
    const [error, setError] = useState(null);

    useEffect(() => {
        const updateState = () => {
            setPlaces(globalPlacesCache);
            setLoading(globalLoading);
        };

        listeners.add(updateState);

        if (!globalUnsubscribe) {
            try {
                globalUnsubscribe = subscribeToCollection(
                    COLLECTIONS.PLACES,
                    (docs) => {
                        globalPlacesCache = (docs || []).map(doc => Place.fromFirestore(doc.id, doc));
                        globalLoading = false;
                        listeners.forEach(l => l());
                    },
                    [],
                    200
                );
            } catch (err) {
                console.error('Error subscribing to places:', err);
                setError(err);
                globalLoading = false;
                listeners.forEach(l => l());
            }
        }

        return () => {
            listeners.delete(updateState);
            // We DON'T unsubscribe globally here to keep data "in memory"
            // The subscription will stay alive for the entire session
        };
    }, []);

    return { places, loading, error };
}
