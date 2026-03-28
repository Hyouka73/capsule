import { useState, useEffect } from 'react';
import { subscribeToCollection } from '../../../services/firestore';
import { COLLECTIONS } from '../../../config/constants';
import Place from '../../../models/Place';
import { cachePlaceThumbnail } from '../../../utils/offlineCache';

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
            const rid = localStorage.getItem('capsule_relationship_id'); 
            if (!rid) return;

            try {
                globalUnsubscribe = subscribeToCollection(
                    COLLECTIONS.PLACES,
                    (docs) => {
                        const newPlaces = (docs || []).map(doc => Place.fromFirestore(doc.id, doc));
                        globalPlacesCache = newPlaces;
                        globalLoading = false;
                        
                        const popularPlaces = [...newPlaces]
                            .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0))
                            .slice(0, 50);
                            
                        popularPlaces.forEach(place => {
                            if (place.coverPhotoUrl && !place.coverPhotoUrl.startsWith('blob:')) {
                                cachePlaceThumbnail(place.id, place.coverPhotoUrl);
                            }
                        });

                        listeners.forEach(l => l());
                    },
                    [['visitedByRelationshipIds', 'array-contains', rid]],
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
