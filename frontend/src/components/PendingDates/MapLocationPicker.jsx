import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import Button from '../ui/Button/Button';
import styles from './MapLocationPicker.module.css';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_CENTER = [16.7521, -93.1152];

// Component to handle map clicks to move the marker
function LocationMarker({ position, setPosition }) {
    const markerRef = useRef(null);

    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    const eventHandlers = {
        dragend() {
            const marker = markerRef.current;
            if (marker != null) {
                setPosition(marker.getLatLng());
            }
        },
    };

    return position === null ? null : (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}
        >
        </Marker>
    );
}

// Component to handle flying to location securely
function FlyToLocation({ targetPos }) {
    const map = useMap();
    useEffect(() => {
        if (targetPos) {
            map.flyTo(targetPos, 15, { duration: 1.5, easeLinearity: 0.25 });
        }
    }, [map, targetPos]);
    return null;
}

export default function MapLocationPicker({ onConfirm, onCancel, initialCoordinates }) {
    const defaultPos = initialCoordinates && initialCoordinates.lat && initialCoordinates.lng
        ? { lat: initialCoordinates.lat, lng: initialCoordinates.lng }
        : { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };

    const [position, setPosition] = useState(defaultPos);
    const [mapCenter] = useState(defaultPos); // initial map center, doesn't change
    const [isLocating, setIsLocating] = useState(false);
    const [targetFlyPos, setTargetFlyPos] = useState(null);
    const hasAttemptedGeo = useRef(false);

    useEffect(() => {
        if (initialCoordinates && initialCoordinates.lat && initialCoordinates.lng) {
            // No geo needed if we already have initial coordinates
            return;
        }

        if (hasAttemptedGeo.current) return;
        hasAttemptedGeo.current = true;

        setIsLocating(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    // Set position to update marker
                    setPosition(newPos);
                    // trigger flyTo
                    setTargetFlyPos(newPos);
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
            onConfirm(position);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={onCancel}>
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h3>Elegir ubicación</h3>
                <div style={{ width: 40 }} /> {/* Spacer */}
            </div>

            <div className={styles.mapWrapper}>
                {isLocating && (
                    <div className={styles.adjustingToast}>
                        <div className={styles.miniSpinner}></div>
                        <span>Ajustando a tu ubicación...</span>
                    </div>
                )}

                <MapContainer
                    center={mapCenter}
                    zoom={15}
                    className={styles.map}
                    zoomControl={false}
                    attributionControl={false}
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                    <LocationMarker position={position} setPosition={setPosition} />
                    <FlyToLocation targetPos={targetFlyPos} />
                </MapContainer>

                <div className={styles.hintOverlay}>
                    Arrastra el pin o toca el mapa para ajustar
                </div>
            </div>

            <div className={styles.footer}>
                <Button
                    className={styles.confirmBtn}
                    onClick={handleConfirm}
                    disabled={!position}
                >
                    Confirmar Ubicación
                    <span className="material-symbols-outlined">location_on</span>
                </Button>
            </div>
        </div>
    );
}
