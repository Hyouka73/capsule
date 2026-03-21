import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Map, MapMarker, MarkerContent, MapControls } from '@/components/ui/map';
import MapPin from '@/components/ui/MapPin/MapPin';
import Button from '../ui/Button/Button';
import { toast } from '../ui/PastelToast/PastelToast';
import { usePlaces } from '../../modules/map/hooks/usePlaces';
import { useOnlineStatus } from '../../modules/map/hooks/useOnlineStatus';
import { reverseGeocode } from '../../services/mapService';
import styles from './MapLocationPicker.module.css';

const DEFAULT_CENTER = [-93.1152, 16.7521]; // [lng, lat] para MapLibre
const DETAILED_MAP_STYLE = {
    light: "https://tiles.openfreemap.org/styles/liberty",
    dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
};

export default function MapLocationPicker({ onConfirm, onCancel, initialCoordinates }) {
    const defaultPos = initialCoordinates?.lat && initialCoordinates?.lng
        ? { lat: initialCoordinates.lat, lng: initialCoordinates.lng }
        : { lat: DEFAULT_CENTER[1], lng: DEFAULT_CENTER[0] };

    const [position, setPosition]               = useState(defaultPos);
    const [viewport, setViewport]               = useState({ center: [defaultPos.lng, defaultPos.lat], zoom: 15 });
    const [isLocating, setIsLocating]           = useState(false);
    const [selectedPlaceId, setSelectedPlaceId] = useState(null);
    const [showConfirmBadge, setShowConfirmBadge] = useState(false);
    const [resolvedName, setResolvedName]       = useState('');
    const [isGeocoding, setIsGeocoding]         = useState(false);
    const [showHint, setShowHint]               = useState(true);
    const [searchTerm, setSearchTerm]           = useState('');
    const [isSearching, setIsSearching]         = useState(false);
    const [searchResults, setSearchResults]     = useState([]);

    // Track previous online state to only show the toast on *transition*
    const wasOnlineRef      = useRef(null);
    const hasAttemptedGeo   = useRef(false);
    const geocodeTimer      = useRef(null);
    const searchTimer       = useRef(null);

    const isOnline  = useOnlineStatus();
    const { places } = usePlaces();

    // ── Ocultar hint tras 4 seg ──────────────────────────────────────────────
    useEffect(() => {
        const t = setTimeout(() => setShowHint(false), 4000);
        return () => clearTimeout(t);
    }, []);

    // ── Notificar cambios de red (solo en transiciones, no en mount) ─────────
    useEffect(() => {
        if (wasOnlineRef.current === null) {
            // Primera ejecución: solo registrar el estado inicial, sin toast
            wasOnlineRef.current = isOnline;
            return;
        }

        if (!isOnline && wasOnlineRef.current) {
            toast.error(
                'Sin conexión',
                'Puedes elegir un lugar guardado o mover el pin manualmente'
            );
        } else if (isOnline && !wasOnlineRef.current) {
            toast.success(
                'Conexión restaurada',
                'La búsqueda y los nombres de lugares ya están disponibles'
            );
        }

        wasOnlineRef.current = isOnline;
    }, [isOnline]);

    // ── Sync con initialCoordinates (preview desde lista) ───────────────────
    useEffect(() => {
        if (initialCoordinates?.lat && initialCoordinates?.lng) {
            const p = { lat: initialCoordinates.lat, lng: initialCoordinates.lng };
            setPosition(p);
            setViewport(v => ({ ...v, center: [p.lng, p.lat], zoom: 16 }));
        }
    }, [initialCoordinates]);

    // ── Geolocalización inicial (solo si no hay coordenadas previas) ─────────
    useEffect(() => {
        if (initialCoordinates?.lat && initialCoordinates?.lng) return;
        if (hasAttemptedGeo.current) return;
        hasAttemptedGeo.current = true;

        setIsLocating(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setPosition(p);
                    setViewport({ center: [p.lng, p.lat], zoom: 15 });
                    setIsLocating(false);
                },
                (err) => {
                    console.warn('Geolocation failed or denied, using fallback', err);
                    setIsLocating(false);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            setIsLocating(false);
        }
    }, [initialCoordinates]);

    // ── Geocodificación inversa (debounced, guarded por isOnline) ────────────
    useEffect(() => {
        if (!position || selectedPlaceId) {
            setResolvedName('');
            return;
        }

        // Sin red: limpiar nombre y salir sin hacer fetch
        if (!isOnline) {
            setResolvedName('');
            return;
        }

        if (geocodeTimer.current) clearTimeout(geocodeTimer.current);

        geocodeTimer.current = setTimeout(async () => {
            setIsGeocoding(true);
            try {
                const result = await reverseGeocode(position.lat, position.lng);
                if (result) setResolvedName(result.name);
            } catch {
                setResolvedName('');
            } finally {
                setIsGeocoding(false);
            }
        }, 1000);

        return () => { if (geocodeTimer.current) clearTimeout(geocodeTimer.current); };
    }, [position, selectedPlaceId, isOnline]);

    // ── Confirmar ubicación ──────────────────────────────────────────────────
    const handleConfirm = () => {
        if (!position) return;

        setShowConfirmBadge(true);
        toast.success('Ubicación Capturada', 'Hemos guardado el lugar de este recuerdo ✨');
        setTimeout(() => {
            setShowConfirmBadge(false);
            onConfirm(position, selectedPlaceId, resolvedName);
        }, 1500);
    };

    // ── Búsqueda de lugares (Nominatim) ──────────────────────────────────────
    const searchPlaces = async (val) => {
        if (!val || val.length < 3) { setSearchResults([]); return; }

        // Sin red: avisar con toast y no intentar el fetch
        if (!isOnline) {
            toast.info(
                'Sin conexión',
                'La búsqueda no está disponible. Mueve el pin o elige un lugar guardado.'
            );
            return;
        }

        setIsSearching(true);
        try {
            // Calcular un área de búsqueda (viewbox) alrededor de donde está mirando el usuario
            // para priorizar resultados cercanos. [lon1, lat1, lon2, lat2]
            const lon = viewport.center[0];
            const lat = viewport.center[1];
            const delta = 0.5; // ~50km a la redonda para priorizar
            const viewbox = `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`;

            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${val}&limit=6&addressdetails=1&viewbox=${viewbox}`
            );
            const data = await res.json();
            setSearchResults(data);
        } catch (e) {
            console.error('Search error', e);
            toast.error('Error de búsqueda', 'No se pudo conectar al servicio de lugares');
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => searchPlaces(val), 800);
    };

    const handleSearchResultClick = (res) => {
        const lat = parseFloat(res.lat);
        const lng = parseFloat(res.lon);
        setPosition({ lat, lng });
        setSelectedPlaceId(null);
        setResolvedName(res.display_name.split(',')[0]);
        setViewport(v => ({ ...v, center: [lng, lat], zoom: 17 }));
        setSearchResults([]);
        setSearchTerm('');
    };

    const handleMapClick = useCallback((e) => {
        const lngLat = e.lngLat || (e.point && e.target?.unproject(e.point));
        if (lngLat) {
            setPosition({ lat: lngLat.lat, lng: lngLat.lng });
            setSelectedPlaceId(null);
        }
    }, []);

    const handleDragEnd = useCallback((lngLat) => {
        setPosition({ lat: lngLat.lat, lng: lngLat.lng });
        setSelectedPlaceId(null);
    }, []);

    const handlePlaceClick = useCallback((place) => {
        setPosition({ lat: place.lat, lng: place.lng });
        setSelectedPlaceId(place.id);
        setViewport(prev => ({ ...prev, center: [place.lng, place.lat] }));
    }, []);

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button type="button" className={styles.backBtn} onClick={onCancel}>
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>

                <div className={styles.searchContainer}>
                    <input
                        type="text"
                        placeholder={
                            isOnline
                                ? "Busca un lugar (ej. Starbucks, Recórcholis)..."
                                : "Búsqueda no disponible sin conexión"
                        }
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className={styles.searchInput}
                        disabled={!isOnline}
                    />
                    {isSearching && <div className={styles.searchSpinner} />}
                </div>

                {searchResults.length > 0 && (
                    <div className={styles.searchResults}>
                        {searchResults.map(res => (
                            <div
                                key={res.place_id}
                                className={styles.searchResultItem}
                                onClick={() => handleSearchResultClick(res)}
                            >
                                <span className="material-symbols-outlined">location_on</span>
                                <div className={styles.searchResultText}>
                                    <strong>{res.display_name.split(',')[0]}</strong>
                                    <span>{res.display_name.split(',').slice(1, 3).join(',')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className={styles.mapWrapper}>
                {isLocating && (
                    <div className={styles.adjustingToast}>
                        <div className={styles.miniSpinner} />
                        <span>Ajustando a tu ubicación...</span>
                    </div>
                )}

                <Map
                    viewport={viewport}
                    onViewportChange={setViewport}
                    className={styles.map}
                    onClick={handleMapClick}
                    attributionControl={false}
                    theme="light"
                    styles={DETAILED_MAP_STYLE}
                >
                    <MapControls position="bottom-right" showZoom={true} />

                    {/* Lugares guardados (siempre disponibles, vienen de IndexedDB) */}
                    {places?.map((place) => (
                        <MapMarker
                            key={place.id}
                            longitude={place.lng}
                            latitude={place.lat}
                            onClick={() => handlePlaceClick(place)}
                        >
                            <div className={`${styles.existingPlaceMarker} ${selectedPlaceId === place.id ? styles.selectedPlace : ''}`}>
                                {place.emoji || '📍'}
                                {selectedPlaceId === place.id && (
                                    <div className={styles.selectionPulse} />
                                )}
                            </div>
                        </MapMarker>
                    ))}

                    {/* Pin de selección principal */}
                    {position && (
                        <MapMarker
                            longitude={position.lng}
                            latitude={position.lat}
                            draggable={true}
                            onDragEnd={handleDragEnd}
                        >
                            <MarkerContent>
                                <MapPin size="medium" selected={true} />
                            </MarkerContent>
                        </MapMarker>
                    )}
                </Map>

                {showHint && (
                    <div className={styles.hintOverlay}>
                        <span className="material-symbols-outlined">touch_app</span>
                        Toca el mapa para marcar ✨
                    </div>
                )}
            </div>

            <div className={styles.footer}>
                {position && !selectedPlaceId && (
                    <div className={styles.resolvedNamePreview}>
                        {!isOnline ? (
                            // Sin red: mostrar coordenadas como fallback informativo
                            <span>
                                📍 Coordenadas guardadas&nbsp;
                                ({position.lat.toFixed(5)}, {position.lng.toFixed(5)})
                            </span>
                        ) : isGeocoding ? (
                            <span className={styles.miniLoader}>Buscando nombre...</span>
                        ) : (
                            <span>📍 {resolvedName || 'Lugar sin nombre'}</span>
                        )}
                    </div>
                )}

                <Button
                    className={styles.confirmBtn}
                    onClick={handleConfirm}
                    disabled={!position || showConfirmBadge}
                    variant="primary"
                >
                    Confirmar ubicación 📍
                    <span className="material-symbols-outlined">check_circle</span>
                </Button>

                {showConfirmBadge && (
                    <div className={styles.confirmBadge}>
                        ✓ ¡Ubicación guardada!
                    </div>
                )}
            </div>
        </div>
    );
}
