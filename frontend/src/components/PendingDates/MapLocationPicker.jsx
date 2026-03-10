import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Map, MapMarker, MarkerContent } from '@/components/ui/map';
import MapPin from '@/components/ui/MapPin/MapPin';
import Button from '../ui/Button/Button';
import { toast } from '../ui/PastelToast/PastelToast';
import { usePlaces } from '../../hooks/usePlaces';
import styles from './MapLocationPicker.module.css';

const DEFAULT_CENTER = [-93.1152, 16.7521]; // [lng, lat] for MapLibre

export default function MapLocationPicker({ onConfirm, onCancel, initialCoordinates }) {
    const defaultPos = initialCoordinates && initialCoordinates.lat && initialCoordinates.lng
        ? { lat: initialCoordinates.lat, lng: initialCoordinates.lng }
        : { lat: DEFAULT_CENTER[1], lng: DEFAULT_CENTER[0] };

    const [position, setPosition] = useState(defaultPos);
    const [viewport, setViewport] = useState({
        center: [defaultPos.lng, defaultPos.lat],
        zoom: 15,
    });
    const [isLocating, setIsLocating] = useState(false);
    const [showConfirmBadge, setShowConfirmBadge] = useState(false);
    const hasAttemptedGeo = useRef(false);

    // Fetch existing places
    const { places } = usePlaces();

    useEffect(() => {
        if (initialCoordinates && initialCoordinates.lat && initialCoordinates.lng) {
            return;
        }

        if (hasAttemptedGeo.current) return;
        hasAttemptedGeo.current = true;

        setIsLocating(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setPosition(newPos);
                    setViewport({
                        center: [newPos.lng, newPos.lat],
                        zoom: 15,
                    });
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

    const handleConfirm = () => {
        if (position) {
            setShowConfirmBadge(true);
            toast.success('Ubicación Capturada', 'Hemos guardado el lugar de este recuerdo ✨');
            setTimeout(() => {
                setShowConfirmBadge(false);
                onConfirm(position);
            }, 2000);
        }
    };

    const handleMapClick = useCallback((e) => {
        // MapLibre event object has lngLat. Sometimes it's deep depending on version/layer
        const lngLat = e.lngLat || (e.point && e.target?.unproject(e.point));
        if (lngLat) {
            setPosition({ lat: lngLat.lat, lng: lngLat.lng });
        }
    }, []);

    const handleDragEnd = useCallback((lngLat) => {
        setPosition({ lat: lngLat.lat, lng: lngLat.lng });
    }, []);

    const handlePlaceClick = useCallback((place) => {
        setPosition({ lat: place.lat, lng: place.lng });
        setViewport(prev => ({
            ...prev,
            center: [place.lng, place.lat]
        }));
    }, []);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={onCancel}>
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className={styles.headerTitle}>
                    <h3>Elegir ubicación</h3>
                    <p>Toca el mapa o elige un lugar existente</p>
                </div>
                <div style={{ width: 40 }} /> {/* Spacer */}
            </div>

            <div className={styles.mapWrapper}>
                {isLocating && (
                    <div className={styles.adjustingToast}>
                        <div className={styles.miniSpinner}></div>
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
                >
                    {/* Existing Places */}
                    {places?.map((place) => (
                        <MapMarker
                            key={place.id}
                            longitude={place.lng}
                            latitude={place.lat}
                            onClick={() => handlePlaceClick(place)}
                        >
                            <div className={styles.existingPlaceMarker}>
                                {place.emoji || '📍'}
                            </div>
                        </MapMarker>
                    ))}

                    {/* Main Selection Pin */}
                    {position && (
                        <MapMarker
                            longitude={position.lng}
                            latitude={position.lat}
                            draggable={true}
                            onDragEnd={handleDragEnd}
                        >
                            <MarkerContent>
                                <MapPin size="large" selected={true} />
                            </MarkerContent>
                        </MapMarker>
                    )}
                </Map>

                <div className={styles.hintOverlay}>
                    <span className="material-symbols-outlined">touch_app</span>
                    Toca cualquier lugar para marcarlo ✨
                </div>
            </div>

            <div className={styles.footer}>
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
