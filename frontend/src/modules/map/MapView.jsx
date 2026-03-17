import { useState, useEffect, useCallback, useMemo } from 'react';
import { Map, MapMarker, MarkerContent, MarkerPopup, MarkerLabel, MapControls } from '@/components/ui/map';
import PhotoViewer from '../../components/ui/PhotoViewer/PhotoViewer';
import MapPin from '../../components/ui/MapPin/MapPin';
import KawaiiInput from '../../components/ui/KawaiiInput/KawaiiInput';
import PendingDatesList from '../../components/PendingDates/PendingDatesList';
import PendingDateForm from '../../components/PendingDates/PendingDateForm';
import { subscribeToGlobalSettings } from '../../services/settingsService';
import { motion, AnimatePresence } from 'framer-motion';
import SnapshotButton from '../snapshots/components/SnapshotButton';
import { toast } from '../../components/ui/PastelToast/PastelToast';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import styles from './MapView.module.css';
import { usePlaces } from './hooks/usePlaces';
import { getMemories } from '../../apiClient';
import Memory from '../../models/Memory';
import PlaceDetailDrawer from './components/PlaceDetailDrawer/PlaceDetailDrawer';

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
    const { queueMemory } = useOfflineQueue();
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

        // Intentar geolocalización inicial si el usuario no tiene recuerdos aún
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setViewport(prev => ({
                        ...prev,
                        center: [pos.coords.longitude, pos.coords.latitude],
                        zoom: 14
                    }));
                    toast.info('Ubicación encontrada ✨', 'Centrando el mapa en ti');
                },
                (err) => console.log('[MapView] Geolocation error:', err),
                { enableHighAccuracy: true, timeout: 10000 }
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

        // Calculate bounds
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

        // Simple heuristic for zoom level based on spread
        const lngDiff = maxLng - minLng;
        const latDiff = maxLat - minLat;
        const maxDiff = Math.max(lngDiff, latDiff);

        let zoom = 14;
        if (maxDiff > 0.5) zoom = 10;
        else if (maxDiff > 0.1) zoom = 12;
        else if (maxDiff > 0.05) zoom = 13;

        setViewport({
            center,
            zoom
        });
        toast.info('Mostrando todo ✨', 'Encontramos todos tus recuerdos');
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
                setPlaceMemories([]); // Clear previous
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
                    <MapControls position="bottom-right" showZoom={true} />

                    {filteredPlaces.filter(p => (p.coordinates?.lat || p.coordinates?.latitude) && (p.coordinates?.lng || p.coordinates?.longitude)).map(place => {
                        const isSelected = selectedPlace?.id === place.id;
                        const zoom = viewport?.zoom || 13;

                        // Icon size logic
                        let size = 'small';
                        if (place.visitCount >= 5) size = 'large';
                        else if (place.visitCount >= 2) size = 'medium';
                        if (zoom < 10) size = 'micro';

                        const scale = zoom >= 14 ? 1 : zoom >= 12 ? 0.7 : zoom >= 10 ? 0.45 : 0.25;
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
                                        <div style={{ transform: `scale(${scale})`, transformOrigin: 'bottom center', display: 'flex' }}>
                                            <MapPin
                                                size={size}
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
                {/* Top Controls: Search & Filters */}
                <div className={styles.topControls}>
                    <div className={`${styles.searchWrapper} ${isSearchActive ? styles.searchWrapperActive : ''}`}>
                        <AnimatePresence mode="wait">
                            {!isSearchActive ? (
                                <motion.button
                                    key="fab"
                                    className={styles.searchFabBtn}
                                    onClick={() => setIsSearchActive(true)}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                >
                                    <span className="material-symbols-outlined">search</span>
                                </motion.button>
                            ) : (
                                <motion.div
                                    key="input"
                                    className={styles.searchContainer}
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: '100%', opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                >
                                    <KawaiiInput
                                        placeholder="Busca un lugar mágico..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onClear={() => {
                                            setSearchQuery('');
                                            setIsSearchActive(false);
                                        }}
                                        autoFocus
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {!isSearchActive && (
                        <div className={styles.filtersScroll}>
                            {activeFilters.map(opt => (
                                <button
                                    key={opt.id}
                                    className={`${styles.chip} ${activeFilter === opt.id ? styles.chipActive : ''}`}
                                    onClick={() => {
                                        setActiveFilter(opt.id);
                                        if (onPlaceSelected) onPlaceSelected(false);
                                    }}
                                >
                                    <span
                                        className={`material-symbols-outlined ${styles.chipIcon}`}
                                        style={activeFilter === opt.id ? { fontVariationSettings: "'FILL' 1" } : {}}
                                    >
                                        {opt.icon}
                                    </span>
                                    {opt.label}
                                </button>
                            ))}
                            {placesLoading && places.length === 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '10px', opacity: 0.6 }}>
                                    ✨ Cargando...
                                </div>
                            )}
                        </div>
                    )}

                    {/* Botón de Instantáneas (Tulip) — Residencia original top right */}
                    {(isPartner || isAdmin) && !isSearchActive && (
                        <div className={styles.snapshotMapBtn}>
                            <SnapshotButton
                                onOpenSnapshot={onOpenSnapshot}
                                onOpenCamera={onOpenCamera}
                            />
                        </div>
                    )}
                </div>


                {/* CITA INSTANTÁNEA (FAB bottom right) — Mantenemos la lógica pero con label correcto */}
                <div className={styles.actionsStack}>
                    <AnimatePresence>
                        {isPartner && !isSearchActive && !citaContext && !selectedPlace && (
                            <motion.div
                                className={styles.fab}
                                initial={{ opacity: 0, scale: 0.5, y: 50 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.5, y: 50 }}
                                transition={{ type: 'spring', damping: 15, stiffness: 250 }}
                            >
                                <button className={styles.fabBtn} onClick={() => {
                                    const minVal = globalSettings?.citaConfig?.minPhotosSpontaneous || 5;
                                    if (onCitaContextChange) onCitaContextChange({ type: 'spontaneous', minPhotos: minVal });
                                }}>
                                    <span className="material-symbols-outlined">camera_alt</span>
                                </button>
                                <span className={styles.fabLabel}>Cita Instantánea ✨</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Place detail drawer component replaces the inline drawer */}
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

            {/* viewerPhotos removed - managed by parent dashboard */}
        </div>
    );
}
