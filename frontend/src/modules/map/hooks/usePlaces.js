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
export function usePlaces() {
    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let unsubscribe = () => { };

        try {
            setLoading(true);

            // subscribeToCollection(collectionName, callback, filters = [], maxResults = 50)
            unsubscribe = subscribeToCollection(
                COLLECTIONS.PLACES,
                (docs) => {
                    const normalizedDocs = (docs || []).map(doc => Place.fromFirestore(doc.id, doc));
                    setPlaces(normalizedDocs);
                    setLoading(false);
                    setError(null);
                },
                [], // No filters
                200 // Max 200 results
            );
        } catch (err) {
            console.error('Error subscribing to places:', err);
            setError(err);
            setLoading(false);
        }

        // Cleanup subscription on unmount
        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, []);

    return { places, loading, error };
}
