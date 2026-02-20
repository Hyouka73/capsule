import { useState, useRef, useEffect } from 'react';
import Map, { Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import styles from './UserLugares.module.css';

const MOCK_PLACES = [
    {
        id: 'p1',
        name: 'Plaza Ambar',
        coordinates: { lat: 16.7380, lng: -93.0800 },
        visitCount: 6,
        photoCount: 12,
        coverPhotoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80',
        lastVisitDate: '14 Feb 2026',
        tags: ['cine', 'comida'],
        photos: [
            'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80',
            'https://images.unsplash.com/photo-1585647347384-2593bc35786b?auto=format&fit=crop&w=200&q=80',
            'https://images.unsplash.com/photo-1481070555726-e2fe83477d4a?auto=format&fit=crop&w=200&q=80'
        ]
    },
    {
        id: 'p2',
        name: 'Parque de la Marimba',
        coordinates: { lat: 16.7533, lng: -93.1182 },
        visitCount: 3,
        photoCount: 4,
        coverPhotoUrl: 'https://images.unsplash.com/photo-1582216669966-22ac585a73e5?auto=format&fit=crop&w=200&q=80',
        lastVisitDate: '28 Ene 2026',
        tags: ['romántico'],
        photos: [
            'https://images.unsplash.com/photo-1582216669966-22ac585a73e5?auto=format&fit=crop&w=200&q=80',
            'https://images.unsplash.com/photo-1522748906645-95d8ad85fa4b?auto=format&fit=crop&w=200&q=80'
        ]
    },
    {
        id: 'p3',
        name: 'Cañón del Sumidero',
        coordinates: { lat: 16.8200, lng: -93.0900 },
        visitCount: 1,
        photoCount: 1,
        coverPhotoUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=200&q=80',
        lastVisitDate: '01 Nov 2025',
        tags: ['aventura'],
        photos: [
            'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=200&q=80'
        ]
    },
    {
        id: 'p4',
        name: 'Cafetería Bonita',
        coordinates: { lat: 16.7500, lng: -93.1100 },
        visitCount: 5,
        photoCount: 8,
        coverPhotoUrl: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=200&q=80',
        lastVisitDate: '20 Feb 2026',
        tags: ['comida', 'romántico'],
        photos: [
            'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=200&q=80',
            'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=200&q=80',
            'https://images.unsplash.com/photo-1514066558159-fc8c737ef259?auto=format&fit=crop&w=200&q=80',
            'https://images.unsplash.com/photo-1445116572660-236099ae4624?auto=format&fit=crop&w=200&q=80'
        ]
    }
];

const FILTER_OPTIONS = [
    { id: 'todos', label: 'Todos', icon: 'favorite' },
    { id: 'cine', label: 'Cine', icon: 'movie' },
    { id: 'comida', label: 'Comida', icon: 'restaurant' },
    { id: 'romántico', label: 'Romántico', icon: 'local_florist' },
    { id: 'aventura', label: 'Aventura', icon: 'hiking' }
];

export default function UserLugares() {
    const mapRef = useRef(null);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [activeFilter, setActiveFilter] = useState('todos');
    const [isDateMode, setIsDateMode] = useState(false);
    const [sessionPhotos, setSessionPhotos] = useState([]);

    // Fallback token just for local dev if not present in env
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoiZHVtbXkiLCJhIjoiY2x0bWFtbW1lMDU2djJqb2RxZXlxYTEyaCJ9.dummy';

    const filteredPlaces = activeFilter === 'todos'
        ? MOCK_PLACES
        : MOCK_PLACES.filter(p => p.tags.includes(activeFilter));

    const handleMapLoad = (e) => {
        const map = e.target;
        const style = map.getStyle();

        // Override Mapbox layers for kawaii/illustrated look
        style.layers.forEach((layer) => {
            const id = layer.id;

            // Ocultar POIs, transit, borders
            if (id.includes('poi') || id.includes('transit') || id.includes('admin') || id.includes('country') || id.includes('state')) {
                map.setLayoutProperty(id, 'visibility', 'none');
                return;
            }

            // Colors
            if (id === 'background') {
                map.setPaintProperty(id, 'background-color', '#fff0f3');
            } else if (id.includes('water') && layer.type === 'fill') {
                map.setPaintProperty(id, 'fill-color', '#b7e4c7');
            } else if ((id.includes('park') || id.includes('green') || id.includes('pitch')) && layer.type === 'fill') {
                map.setPaintProperty(id, 'fill-color', '#d4f0e0');
            } else if (id.includes('road')) {
                if (layer.type === 'line') {
                    if (id.includes('primary') || id.includes('secondary') || id.includes('arterial')) {
                        map.setPaintProperty(id, 'line-color', '#ffe5e5');
                        map.setPaintProperty(id, 'line-width', 1.5);
                    } else {
                        map.setPaintProperty(id, 'line-color', '#fff0f3');
                        map.setPaintProperty(id, 'line-width', 1);
                    }
                } else if (layer.type === 'symbol') {
                    map.setPaintProperty(id, 'text-color', '#bcacad');
                }
            } else if (id.includes('building') && layer.type === 'fill') {
                map.setPaintProperty(id, 'fill-color', '#ffe5e5');
                map.setPaintProperty(id, 'fill-opacity', 0.4);
            } else if (id.includes('place')) {
                if (id.includes('city') || id.includes('town')) {
                    map.setPaintProperty(id, 'text-color', '#8c6a6a');
                } else {
                    map.setPaintProperty(id, 'text-color', '#bcacad');
                }
            }
        });
    };

    const handleMarkerClick = (place, e) => {
        e.originalEvent.stopPropagation();
        setSelectedPlace(place);
        if (mapRef.current) {
            mapRef.current.flyTo({
                center: [place.coordinates.lng, place.coordinates.lat],
                zoom: 15,
                duration: 1000,
                offset: [0, -100] // account for bottom drawer
            });
        }
    };

    const handleMapClick = () => {
        setSelectedPlace(null);
    };

    const renderPinIcon = (place) => {
        const isSelected = selectedPlace?.id === place.id;
        if (place.visitCount >= 5) {
            return (
                <div className={`${styles.markerContainer} ${isSelected ? styles.selected : ''}`}>
                    <div className={styles.pulseRing}></div>
                    <div className={styles.teardropLarge}>
                        <img src={place.coverPhotoUrl} alt="cover" className={styles.markerPhoto} />
                    </div>
                </div>
            );
        } else if (place.visitCount >= 2) {
            return (
                <div className={`${styles.markerContainer} ${isSelected ? styles.selected : ''}`}>
                    <div className={styles.teardropMedium}>
                        <span className={`material-symbols-outlined ${styles.markerIcon}`} style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                    </div>
                </div>
            );
        } else {
            return (
                <div className={`${styles.markerContainer} ${isSelected ? styles.selected : ''}`}>
                    <div className={styles.teardropSmall}>
                        <div className={styles.markerDot}></div>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className={styles.mapContainer}>
            <Map
                ref={mapRef}
                mapboxAccessToken={mapboxToken}
                initialViewState={{
                    longitude: -93.1152,
                    latitude: 16.7521,
                    zoom: 13
                }}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/light-v11"
                scrollZoom={false}
                dragRotate={false}
                pitchWithRotate={false}
                onLoad={handleMapLoad}
                onClick={handleMapClick}
                attributionControl={false}
                logoPosition="bottom-right"
            >
                {filteredPlaces.map(place => (
                    <Marker
                        key={place.id}
                        longitude={place.coordinates.lng}
                        latitude={place.coordinates.lat}
                        anchor="bottom"
                        onClick={(e) => handleMarkerClick(place, e)}
                    >
                        {renderPinIcon(place)}
                    </Marker>
                ))}
            </Map>

            {/* Header flotante */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.headerTitle}>
                        <span className={`material-symbols-outlined ${styles.headerIcon}`}>favorite</span>
                        Nuestros Lugares
                    </h1>
                    <p className={styles.headerSubtitle}>{MOCK_PLACES.length} lugares guardados</p>
                </div>
                <button className={styles.addBtn} type="button">
                    <span className="material-symbols-outlined">add</span>
                </button>
            </div>

            {/* Filtros */}
            <div className={styles.filtersWrapper}>
                <div className={styles.filtersContainer}>
                    {FILTER_OPTIONS.map(opt => (
                        <button
                            key={opt.id}
                            className={`${styles.filterChip} ${activeFilter === opt.id ? styles.filterChipActive : ''}`}
                            onClick={() => {
                                setActiveFilter(opt.id);
                                setSelectedPlace(null);
                            }}
                        >
                            <span className={`material-symbols-outlined ${styles.filterIcon}`} style={activeFilter === opt.id ? { fontVariationSettings: "'FILL' 1" } : {}}>
                                {opt.icon}
                            </span>
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* FAB Modo Cita */}
            {!isDateMode && (
                <div className={styles.fabCita}>
                    <button className={styles.fabBtn} onClick={() => setIsDateMode(true)}>
                        <span className="material-symbols-outlined">camera_alt</span>
                    </button>
                    <span className={styles.fabLabel}>Estamos de cita</span>
                </div>
            )}

            {/* Drawer */}
            {!isDateMode && (
                <div className={styles.bottomDrawer} style={{ height: selectedPlace ? '360px' : '120px' }}>
                    {!selectedPlace ? (
                        <div className={styles.drawerEmpty}>
                            <span className={`material-symbols-outlined ${styles.drawerEmptyIcon}`}>map</span>
                            <p className={styles.drawerEmptyText}>Toca un lugar para revivir ese momento</p>
                        </div>
                    ) : (
                        <div className={styles.drawerContentArea}>
                            <div className={styles.dragHandle}></div>
                            <div className={styles.placeHeader}>
                                <h2 className={styles.placeTitle}>{selectedPlace.name}</h2>
                                <button className={styles.placeHeartBtn}>
                                    <span className="material-symbols-outlined">favorite</span>
                                </button>
                            </div>
                            <div className={styles.placeDate}>
                                <span className={`material-symbols-outlined ${styles.dateIcon}`}>calendar_month</span>
                                {selectedPlace.lastVisitDate}
                            </div>

                            <div className={styles.photoStrip}>
                                {selectedPlace.photos.slice(0, 4).map((url, idx) => (
                                    <div key={idx} className={styles.photoOverlayWrapper}>
                                        <img src={url} alt="memory" className={styles.photoThumbnail} />
                                        {idx === 3 && selectedPlace.photos.length > 4 && (
                                            <div className={styles.photoOverlay}>
                                                +{selectedPlace.photos.length - 4}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className={styles.tagsRow}>
                                {selectedPlace.tags.map(tag => (
                                    <span key={tag} className={styles.tagPill}>
                                        {tag.charAt(0).toUpperCase() + tag.slice(1)}
                                    </span>
                                ))}
                            </div>

                            <button className={styles.ctaBtn}>
                                Ver recuerdos →
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ESTADO 2 - MODO CITA */}
            {isDateMode && (
                <div className={styles.citaOverlay}>
                    <div className={styles.citaHeader}>
                        <div className={styles.headerLeft}>
                            <h1 className={styles.citaTitleText}>🟢 Modo Cita</h1>
                            <p className={styles.citaSubtitle}>Detectando ubicación...</p>
                        </div>
                        <button className={styles.closeCitaBtn} onClick={() => setIsDateMode(false)}>
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className={styles.centerContent}>
                        <button className={styles.hugeCameraBtn}>
                            <span className="material-symbols-outlined">add_a_photo</span>
                        </button>
                        <span className={styles.hugeCameraLabel}>Subir foto</span>

                        <div className={styles.secondaryActions}>
                            <button className={styles.secondaryActionBtn}>
                                <span className="material-symbols-outlined">photo_library</span>
                                De galería
                            </button>
                            <button className={styles.secondaryActionBtn}>
                                <span className="material-symbols-outlined">confirmation_number</span>
                                Agregar boleto
                            </button>
                        </div>
                    </div>

                    <div className={styles.citaBottomStrip}>
                        <h3 className={styles.stripTitle}>Esta cita</h3>
                        {sessionPhotos.length === 0 ? (
                            <p className={styles.stripEmpty}>¡Toma la primera foto! 📸</p>
                        ) : (
                            <div className={styles.stripPhotos}>
                                {sessionPhotos.map((photo, i) => (
                                    <img key={i} src={photo} alt="Session" className={styles.stripImage} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
