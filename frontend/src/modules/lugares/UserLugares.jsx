import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './UserLugares.module.css';

// Fix leaflet default icon paths broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MOCK_PLACES = [
    {
        id: 'p1',
        name: 'Plaza Ambar',
        emoji: '🎬',
        coordinates: { lat: 16.7380, lng: -93.0800 },
        visitCount: 6,
        coverPhotoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80',
        lastVisitDate: '14 Feb 2026',
        tags: ['cine', 'comida'],
        photos: [
            'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80',
            'https://images.unsplash.com/photo-1585647347384-2593bc35786b?auto=format&fit=crop&w=200&q=80',
            'https://images.unsplash.com/photo-1481070555726-e2fe83477d4a?auto=format&fit=crop&w=200&q=80',
        ]
    },
    {
        id: 'p2',
        name: 'Parque de la Marimba',
        emoji: '🌸',
        coordinates: { lat: 16.7533, lng: -93.1182 },
        visitCount: 3,
        coverPhotoUrl: 'https://images.unsplash.com/photo-1582216669966-22ac585a73e5?auto=format&fit=crop&w=200&q=80',
        lastVisitDate: '28 Ene 2026',
        tags: ['romántico'],
        photos: [
            'https://images.unsplash.com/photo-1582216669966-22ac585a73e5?auto=format&fit=crop&w=200&q=80',
            'https://images.unsplash.com/photo-1522748906645-95d8ad85fa4b?auto=format&fit=crop&w=200&q=80',
        ]
    },
    {
        id: 'p3',
        name: 'Cañón del Sumidero',
        emoji: '🏔️',
        coordinates: { lat: 16.8200, lng: -93.0900 },
        visitCount: 1,
        coverPhotoUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=200&q=80',
        lastVisitDate: '01 Nov 2025',
        tags: ['aventura'],
        photos: [
            'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=200&q=80',
        ]
    },
    {
        id: 'p4',
        name: 'Cafetería Bonita',
        emoji: '☕',
        coordinates: { lat: 16.7500, lng: -93.1100 },
        visitCount: 5,
        coverPhotoUrl: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=200&q=80',
        lastVisitDate: '20 Feb 2026',
        tags: ['comida', 'romántico'],
        photos: [
            'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=200&q=80',
            'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=200&q=80',
            'https://images.unsplash.com/photo-1514066558159-fc8c737ef259?auto=format&fit=crop&w=200&q=80',
            'https://images.unsplash.com/photo-1445116572660-236099ae4624?auto=format&fit=crop&w=200&q=80',
        ]
    }
];

const FILTER_OPTIONS = [
    { id: 'todos', label: 'Todos', icon: 'favorite' },
    { id: 'cine', label: 'Cine', icon: 'movie' },
    { id: 'comida', label: 'Comida', icon: 'restaurant' },
    { id: 'romántico', label: 'Romántico', icon: 'local_florist' },
    { id: 'aventura', label: 'Aventura', icon: 'hiking' },
];

// Fly to a selected place
function FlyToPlace({ place }) {
    const map = useMap();
    if (place) {
        // Offset latitude by -0.005 so the pin appears in the upper half above the drawer
        map.flyTo([place.coordinates.lat - 0.005, place.coordinates.lng], 15, { duration: 1.2, easeLinearity: 0.25 });
    }
    return null;
}

// Build custom Leaflet div icon per place type
function buildIcon(place, isSelected) {
    if (place.visitCount >= 5) {
        return L.divIcon({
            className: '',
            html: `
                <div style="position:relative;width:64px;height:64px;">
                    <div class="${styles.pinPulse}"></div>
                    <div class="${styles.pinLarge} ${isSelected ? styles.pinSelected : ''}">
                        <img class="${styles.pinPhoto}" src="${place.coverPhotoUrl}" alt="" />
                    </div>
                    <div class="${styles.pinShadow}"></div>
                </div>`,
            iconSize: [64, 64],
            iconAnchor: [32, 58],
            popupAnchor: [0, -64],
        });
    } else if (place.visitCount >= 2) {
        return L.divIcon({
            className: '',
            html: `
                <div style="position:relative;width:44px;height:44px;">
                    <div class="${styles.pinMedium} ${isSelected ? styles.pinSelected : ''}">
                        <span class="material-symbols-outlined ${styles.pinIcon}">favorite</span>
                    </div>
                    <div class="${styles.pinShadow}"></div>
                </div>`,
            iconSize: [44, 44],
            iconAnchor: [22, 40],
            popupAnchor: [0, -44],
        });
    } else {
        return L.divIcon({
            className: '',
            html: `
                <div style="position:relative;width:30px;height:30px;">
                    <div class="${styles.pinSmall} ${isSelected ? styles.pinSelected : ''}">
                        <div class="${styles.pinDot}"></div>
                    </div>
                    <div class="${styles.pinShadow}"></div>
                </div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 27],
            popupAnchor: [0, -30],
        });
    }
}

export default function UserLugares() {
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [activeFilter, setActiveFilter] = useState('todos');
    const [citaContext, setCitaContext] = useState(null);
    const [sessionPhotos, setSessionPhotos] = useState([]);
    const [toastMessage, setToastMessage] = useState(null);
    const [warningOpen, setWarningOpen] = useState(false);

    // Search state
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleImageError = (e) => {
        e.target.onerror = null;
        e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%2388d8b0"/><path d="M22 22h20v20H22z" fill="none"/><path d="M42 22H22c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V24c0-1.1-.9-2-2-2zm0 18H22V24h20v16zm-11.5-6.67L27 36.5l-3-4-4 5.5h18l-5.5-7.33z" fill="white"/></svg>';
    };

    const filteredPlaces = MOCK_PLACES.filter(p => {
        const matchesFilter = activeFilter === 'todos' || p.tags.includes(activeFilter);
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <div className={styles.screen}>

            {/* ── THE MAP (fills entire background) ── */}
            <div className={styles.mapLayer}>
                <MapContainer
                    center={[16.7521, -93.1152]}
                    zoom={13}
                    style={{ width: '100%', height: '100%' }}
                    zoomControl={false}
                    attributionControl={false}
                    scrollWheelZoom={false}
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        subdomains="abcd"
                        maxZoom={19}
                    />
                    <FlyToPlace place={selectedPlace} />
                    {filteredPlaces.map(place => (
                        <Marker
                            key={place.id}
                            position={[place.coordinates.lat, place.coordinates.lng]}
                            icon={buildIcon(place, selectedPlace?.id === place.id)}
                            eventHandlers={{ click: () => setSelectedPlace(prev => prev?.id === place.id ? null : place) }}
                        />
                    ))}
                </MapContainer>
            </div>

            {/* ── OVERLAY LAYER (all UI lives here, above map) ── */}
            <div className={styles.overlay}>

                {/* Header pill */}
                <header className={`${styles.header} ${isSearchActive ? styles.headerSearchActive : ''}`}>
                    {!isSearchActive ? (
                        <>
                            <div className={styles.headerInfo}>
                                <p className={styles.headerEyebrow}>📍 Chiapas, México</p>
                                <h1 className={styles.headerTitle}>Nuestros Lugares</h1>
                            </div>
                            <button
                                className={styles.addBtn}
                                type="button"
                                aria-label="Buscar lugar"
                                onClick={() => setIsSearchActive(true)}
                            >
                                <span className="material-symbols-outlined">search</span>
                            </button>
                        </>
                    ) : (
                        <div className={styles.searchContainer}>
                            <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="Buscar lugar..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                            <button
                                className={styles.closeSearchBtn}
                                onClick={() => {
                                    setIsSearchActive(false);
                                    setSearchQuery('');
                                }}
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                    )}
                </header>

                {/* Filter chips */}
                <div className={styles.filtersBar}>
                    {FILTER_OPTIONS.map(opt => (
                        <button
                            key={opt.id}
                            className={`${styles.chip} ${activeFilter === opt.id ? styles.chipActive : ''}`}
                            onClick={() => { setActiveFilter(opt.id); setSelectedPlace(null); }}
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
                </div>

                {/* FAB */}
                {!citaContext && !selectedPlace && (
                    <div className={styles.fab}>
                        <button className={styles.fabBtn} onClick={() => setCitaContext({ type: 'spontaneous', minPhotos: 5 })}>
                            <span className="material-symbols-outlined">camera_alt</span>
                        </button>
                        <span className={styles.fabLabel}>Estamos de cita ✨</span>
                    </div>
                )}

                {/* Place detail drawer */}
                {!citaContext && (
                    <div className={`${styles.drawer} ${selectedPlace ? styles.drawerOpen : ''}`}>
                        {!selectedPlace ? (
                            <div className={styles.drawerHint}>
                                <span className={styles.drawerHintEmoji}>🗺️</span>
                                <p>Toca un lugar para revivir ese momento</p>
                            </div>
                        ) : (
                            <div className={styles.drawerContent}>
                                <div className={styles.drawerHandle} />

                                <div className={styles.placeRow}>
                                    <div>
                                        <span className={styles.placeEmoji}>{selectedPlace.emoji}</span>
                                        <h2 className={styles.placeName}>{selectedPlace.name}</h2>
                                        <p className={styles.placeDate}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>calendar_month</span>
                                            {selectedPlace.lastVisitDate}
                                        </p>
                                    </div>
                                    <button
                                        className={styles.closeDrawer}
                                        onClick={() => setSelectedPlace(null)}
                                        aria-label="Cerrar"
                                    >
                                        <span className="material-symbols-outlined">keyboard_arrow_down</span>
                                    </button>
                                </div>

                                <div className={styles.photos}>
                                    {selectedPlace.photos.slice(0, 4).map((url, i) => (
                                        <div key={i} className={styles.photoWrap}>
                                            <img src={url} alt="" className={styles.photo} onError={handleImageError} />
                                            {i === 3 && selectedPlace.photos.length > 4 && (
                                                <div className={styles.photoMore}>+{selectedPlace.photos.length - 4}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.tags}>
                                    {selectedPlace.tags.map(t => (
                                        <span key={t} className={styles.tag}>{t}</span>
                                    ))}
                                    <span className={styles.tagVisits}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>favorite</span>
                                        {selectedPlace.visitCount} visitas
                                    </span>
                                </div>

                                <button className={styles.ctaBtn}>
                                    Ver todos los recuerdos →
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Modo Cita */}
                {citaContext && (
                    <div className={styles.citaOverlay}>
                        <div className={styles.citaCard}>
                            <div className={styles.citaHeader}>
                                <div>
                                    <p className={styles.citaLive}>🟢 Modo Cita activo</p>
                                    <p className={styles.citaSub}>Detectando tu ubicación...</p>
                                </div>
                                <button className={styles.citaClose} onClick={() => {
                                    if (sessionPhotos.length < citaContext.minPhotos) {
                                        setWarningOpen(true);
                                    } else {
                                        setCitaContext(null);
                                        setSessionPhotos([]);
                                        setWarningOpen(false);
                                        showToast("Recuerdo guardado 💚");
                                    }
                                }}>
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {citaContext.type === 'bingo' && (
                                <div className={styles.bingoPill}>
                                    {citaContext.bingoLabel || '📍 Bingo'}
                                </div>
                            )}

                            <div className={styles.progressRow}>
                                <div className={styles.circles}>
                                    {Array.from({ length: citaContext.minPhotos }).map((_, i) => (
                                        <div key={i} className={`${styles.circle} ${i < sessionPhotos.length ? styles.circleFilled : ''}`} />
                                    ))}
                                </div>
                                <span className={`${styles.progressLabel} ${sessionPhotos.length >= citaContext.minPhotos ? styles.progressComplete : ''}`}>
                                    {sessionPhotos.length >= citaContext.minPhotos
                                        ? "✅ ¡Cita completada! Puedes seguir subiendo fotos"
                                        : `${sessionPhotos.length}/${citaContext.minPhotos} fotos para completar la cita`}
                                </span>
                            </div>

                            <button className={styles.bigCamera} onClick={() => {
                                const UNSPLASH_URLS = [
                                    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80',
                                    'https://images.unsplash.com/photo-1585647347384-2593bc35786b?auto=format&fit=crop&w=200&q=80',
                                    'https://images.unsplash.com/photo-1481070555726-e2fe83477d4a?auto=format&fit=crop&w=200&q=80',
                                    'https://images.unsplash.com/photo-1582216669966-22ac585a73e5?auto=format&fit=crop&w=200&q=80',
                                    'https://images.unsplash.com/photo-1522748906645-95d8ad85fa4b?auto=format&fit=crop&w=200&q=80',
                                    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=200&q=80',
                                ];
                                const randomUrl = UNSPLASH_URLS[Math.floor(Math.random() * UNSPLASH_URLS.length)];
                                setSessionPhotos([...sessionPhotos, randomUrl]);
                            }}>
                                <span className="material-symbols-outlined">add_a_photo</span>
                            </button>
                            <p className={styles.bigCameraLabel}>Toma una foto ahora</p>

                            {sessionPhotos.length > 0 && (
                                <div className={styles.sessionPhotosStrip}>
                                    {sessionPhotos.map((url, i) => (
                                        <img key={i} src={url} alt="" className={styles.sessionPhotoThumb} onError={handleImageError} />
                                    ))}
                                </div>
                            )}

                            <div className={styles.citaActions}>
                                <button className={styles.citaAction}>
                                    <span className="material-symbols-outlined">photo_library</span>
                                    Galería
                                </button>
                                <button className={styles.citaAction}>
                                    <span className="material-symbols-outlined">confirmation_number</span>
                                    Boleto
                                </button>
                            </div>

                            {warningOpen && (
                                <div className={styles.warningBox}>
                                    <p>Aún no hay suficientes fotos para completar la cita. ¿Salir de todas formas?</p>
                                    <div className={styles.warningActions}>
                                        <button className={styles.warningBtnPrimary} onClick={() => setWarningOpen(false)}>Seguir</button>
                                        <button className={styles.warningBtnSecondary} onClick={() => {
                                            setCitaContext(null);
                                            setSessionPhotos([]);
                                            setWarningOpen(false);
                                        }}>Salir sin guardar</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Toast */}
                {toastMessage && (
                    <div className={styles.toast}>
                        {toastMessage}
                    </div>
                )}
            </div>
        </div>
    );
}
