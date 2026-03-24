import { useState, useEffect, useCallback, useMemo } from 'react';
import { Map, MapMarker, MarkerContent, MapControls, MarkerLabel } from '@/components/ui/map';
import MapPin from '../../components/ui/MapPin/MapPin';
import { subscribeToGlobalSettings } from '../../services/settingsService';
import { toast } from '../../components/ui/PastelToast/PastelToast';
import { useAuth } from '../../hooks/useAuth';
import styles from './MapView.module.css';
import { usePlaces } from './hooks/usePlaces';
import { getMemories } from '../../apiClient';

// Sub-components
import PlaceDetailDrawer from './components/PlaceDetailDrawer/PlaceDetailDrawer';
import SearchOverlay from './components/SearchOverlay';
import ActionFabs from './components/ActionFabs';

export default function MapView({
    onPlaceSelected,
    bingoContextToMap,
    clearBingoContext,
    openPendingSignal,
    onPendingSignalHandled,
    onOpenSnapshot,
    onOpenCamera,
    citaContext,
    onCitaContextChange,
    onOpenPending,
    onOpenPhotoViewer
}) {
    const { isPartner, isAdmin } = useAuth();
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [activeFilter, setActiveFilter] = useState('todos');
    const [globalSettings, setGlobalSettings] = useState(null);
    const [placeMemories, setPlaceMemories] = useState([]);
    const [loadingMemories, setLoadingMemories] = useState(false);

    // Tuxtla Gutiérrez, Chiapas
    const [viewport, setViewport] = useState({
        center: [-93.1152, 16.7521], // MapLibre uses [lng, lat]
        zoom: 13,
    });

    useEffect(() => {
        const unsub = subscribeToGlobalSettings(data => {
            if (data) setGlobalSettings(data);
        });

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setViewport(prev => ({
                        ...prev,
                        center: [pos.coords.longitude, pos.coords.latitude],
                        zoom: 14
                    }));
                },
                (err) => {
                    if (err.code === 3) console.warn('[MapView] Geolocation timeout');
                    else console.log('[MapView] Geolocation error:', err);
                },
                { enableHighAccuracy: false, timeout: 30000, maximumAge: 300000 }
            );
        }

        return unsub;
    }, []);

    useEffect(() => {
        if (bingoContextToMap) {
            if (onCitaContextChange) onCitaContextChange(bingoContextToMap);
            if (clearBingoContext) clearBingoContext();
            if (onPlaceSelected) onPlaceSelected(true);
        }
    }, [bingoContextToMap, clearBingoContext, onPlaceSelected, onCitaContextChange]);

    const { places, loading: placesLoading } = usePlaces();
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (openPendingSignal) {
            if (onOpenPending) onOpenPending();
            if (onPendingSignalHandled) onPendingSignalHandled();
        }
    }, [openPendingSignal, onPendingSignalHandled, onOpenPending]);

    useEffect(() => {
        const isAnyOverlayOpen = !!citaContext || !!selectedPlace || isSearchActive;
        if (onPlaceSelected) onPlaceSelected(isAnyOverlayOpen);
    }, [citaContext, selectedPlace, isSearchActive, onPlaceSelected]);

    const filteredPlaces = useMemo(() => {
        return places.filter(p => {
            const hasCitas = (p.visitCount || 0) > 0;
            const matchesFilter = activeFilter === 'todos' || p.tags?.includes(activeFilter);
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            return hasCitas && matchesFilter && matchesSearch;
        });
    }, [places, activeFilter, searchQuery]);

    const uniqueTags = useMemo(() => {
        const visiblePlaces = places.filter(p => (p.visitCount || 0) > 0);
        return [...new Set(visiblePlaces.flatMap(p => p.tags ?? []))];
    }, [places]);

    const TAG_ICONS = {
        'cine': 'movie',
        'comida': 'restaurant',
        'romántico': 'local_florist',
        'aventura': 'hiking',
        'relajación': 'spa',
        'fiesta': 'celebration',
        'misterioso': 'help_center',
        'todos': 'favorite'
    };

    const activeFilters = [
        { id: 'todos', label: 'Todos', icon: 'favorite' },
        ...uniqueTags.map(tag => ({
            id: tag,
            label: tag.charAt(0).toUpperCase() + tag.slice(1),
            icon: TAG_ICONS[tag] || 'bookmark'
        }))
    ];

    const handleMarkerClick = useCallback((place) => {
        const newPlace = selectedPlace?.id === place.id ? null : place;
        setSelectedPlace(newPlace);
        if (onPlaceSelected) onPlaceSelected(!!newPlace);
    }, [selectedPlace, onPlaceSelected]);

    const handleMapClick = useCallback(() => {
        if (isSearchActive) setIsSearchActive(false);
        if (selectedPlace) {
            setSelectedPlace(null);
            if (onPlaceSelected) onPlaceSelected(false);
        }
    }, [isSearchActive, selectedPlace, onPlaceSelected]);

    const handleFitAll = useCallback(() => {
        if (places.length === 0) return;

        const validPlaces = places.filter(p => (p.coordinates?.lat || p.coordinates?.latitude) && (p.coordinates?.lng || p.coordinates?.longitude));
        if (validPlaces.length === 0) return;

        let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
        validPlaces.forEach(p => {
            const lng = p.coordinates.lng;
            const lat = p.coordinates.lat;
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
        });

        const center = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
        const lngDiff = maxLng - minLng;
        const latDiff = maxLat - minLat;
        const maxDiff = Math.max(lngDiff, latDiff);

        let zoom = 14;
        if (maxDiff > 0.5) zoom = 10;
        else if (maxDiff > 0.1) zoom = 12;
        else if (maxDiff > 0.05) zoom = 13;

        setViewport({ center, zoom });
    }, [places]);

    useEffect(() => {
        if (!placesLoading && filteredPlaces.length > 0) {
            handleFitAll();
        }
    }, [activeFilter, placesLoading, handleFitAll]);

    useEffect(() => {
        if (selectedPlace && selectedPlace.id) {
            const fetchMemories = async () => {
                setLoadingMemories(true);
                setPlaceMemories([]);
                try {
                    const result = await getMemories({ placeId: selectedPlace.id, limit: 10 });
                    if (result.success) {
                        setPlaceMemories(result.docs || []);
                    }
                } catch (err) {
                    console.error('[MapView] Error fetching memories for place:', err);
                } finally {
                    setLoadingMemories(false);
                }
            };
            fetchMemories();
        } else {
            setPlaceMemories([]);
        }
    }, [selectedPlace]);

    useEffect(() => {
        if (selectedPlace && selectedPlace.coordinates) {
            setViewport(prev => ({
                ...prev,
                center: [selectedPlace.coordinates.lng, selectedPlace.coordinates.lat],
                zoom: 16
            }));
        }
    }, [selectedPlace]);

    return (
        <div className={styles.screen}>
            {/* ── THE MAP ── */}
            <div className={styles.mapLayer}>
                <Map
                    viewport={viewport}
                    onViewportChange={setViewport}
                    className={styles.map}
                    attributionControl={false}
                    theme="light"
                    onClick={handleMapClick}
                >
                    {/* Controles de zoom eliminados por petición del usuario */}

                    {filteredPlaces.filter(p => (p.coordinates?.lat || p.coordinates?.latitude) && (p.coordinates?.lng || p.coordinates?.longitude)).map(place => {
                        const isSelected = selectedPlace?.id === place.id;
                        const zoom = viewport?.zoom || 13;

                        // Calculate dynamic style based on tiers
                        const getPinStyle = (visitCount, tiers) => {
                            const fallback = { color: "#FFB6C1", scale: 1.0 };
                            if (!tiers || tiers.length === 0) return fallback;
                            
                            // Find the highest tier that matches the visitCount
                            const sortedTiers = [...tiers].sort((a, b) => b.minVisits - a.minVisits);
                            const match = sortedTiers.find(t => visitCount >= t.minVisits);
                            return match || fallback;
                        };

                        const tierStyle = getPinStyle(place.visitCount || 0, globalSettings?.mapConfig?.pinTiers);

                        let size = 'small';
                        if (place.visitCount >= 5) size = 'large';
                        else if (place.visitCount >= 2) size = 'medium';
                        if (zoom < 10) size = 'micro';

                        // Base scale from zoom + additional scale from tier
                        const zoomScale = zoom >= 14 ? 1 : zoom >= 12 ? 0.7 : zoom >= 10 ? 0.45 : 0.25;
                        const finalScale = zoomScale * (tierStyle.scale || 1.0);
                        
                        const hideIcon = zoom < 12;
                        const hidePulse = zoom < 13;

                        return (
                            <MapMarker
                                key={place.id}
                                longitude={place.coordinates.lng}
                                latitude={place.coordinates.lat}
                                onClick={() => handleMarkerClick(place)}
                            >
                                <MarkerContent>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: size === 'micro' ? 'center' : 'flex-end',
                                        justifyContent: 'center',
                                        position: 'relative'
                                    }}>
                                        <div style={{ transform: `scale(${finalScale})`, transformOrigin: 'bottom center', display: 'flex' }}>
                                            <MapPin
                                                size={size}
                                                color={tierStyle.color}
                                                selected={isSelected}
                                                hideIcon={hideIcon}
                                                hidePulse={hidePulse}
                                            />
                                        </div>
                                    </div>
                                </MarkerContent>
                                <MarkerLabel className={styles.pinLabel} position="top">
                                    {place.name}
                                </MarkerLabel>
                            </MapMarker>
                        );
                    })}
                </Map>
            </div>

            {/* ── OVERLAY LAYER ── */}
            <div className={styles.overlay}>
                <SearchOverlay 
                    isSearchActive={isSearchActive}
                    setIsSearchActive={setIsSearchActive}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    activeFilters={activeFilters}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    placesLoading={placesLoading}
                    places={places}
                    onPlaceSelected={onPlaceSelected}
                    isPartner={isPartner}
                    isAdmin={isAdmin}
                    onOpenSnapshot={onOpenSnapshot}
                    onOpenCamera={onOpenCamera}
                />

                <ActionFabs 
                    isPartner={isPartner}
                    isSearchActive={isSearchActive}
                    citaContext={citaContext}
                    selectedPlace={selectedPlace}
                    onSpontaneousCita={() => {
                        const minVal = globalSettings?.citaConfig?.minPhotosSpontaneous || 5;
                        if (onCitaContextChange) onCitaContextChange({ type: 'spontaneous', minPhotos: minVal });
                    }}
                />

                {!isSearchActive && (
                    <PlaceDetailDrawer
                        selectedPlace={selectedPlace}
                        onClose={() => {
                            setSelectedPlace(null);
                            if (onPlaceSelected) onPlaceSelected(false);
                        }}
                        loadingMemories={loadingMemories}
                        placeMemories={placeMemories}
                        onPhotoClick={onOpenPhotoViewer}
                        citaContext={citaContext}
                        onVerifyPlace={(place) => {
                            if (onCitaContextChange) {
                                onCitaContextChange({ 
                                    ...citaContext,
                                    placeId: place.id, 
                                    name: place.name,
                                    verified: true
                                });
                            }
                        }}
                    />
                )}
            </div>
        </div>
    );
}
