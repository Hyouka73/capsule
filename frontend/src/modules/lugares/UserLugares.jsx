import { useState, useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import PhotoViewer from '../../components/ui/PhotoViewer/PhotoViewer';
import MapPin from '../../components/ui/MapPin/MapPin';
import KawaiiInput from '../../components/ui/KawaiiInput/KawaiiInput';
import PendingWarningBtn from './components/PendingDates/PendingWarningBtn';
import PendingDatesList from './components/PendingDates/PendingDatesList';
import PendingDateForm from './components/PendingDates/PendingDateForm';
import { toast } from '../../components/ui/PastelToast/PastelToast';
import { subscribeToGlobalSettings } from '../../services/settingsService';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
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
        visits: [
            {
                id: 'v1',
                date: '14 Feb 2026',
                coverPhoto: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80',
                photos: [
                    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1585647347384-2593bc35786b?auto=format&fit=crop&w=800&q=80',
                ]
            },
            {
                id: 'v2',
                date: '02 Feb 2026',
                coverPhoto: 'https://images.unsplash.com/photo-1481070555726-e2fe83477d4a?auto=format&fit=crop&w=200&q=80',
                photos: [
                    'https://images.unsplash.com/photo-1481070555726-e2fe83477d4a?auto=format&fit=crop&w=800&q=80',
                ]
            }
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
        visits: [
            {
                id: 'v3',
                date: '28 Ene 2026',
                coverPhoto: 'https://images.unsplash.com/photo-1582216669966-22ac585a73e5?auto=format&fit=crop&w=200&q=80',
                photos: [
                    'https://images.unsplash.com/photo-1582216669966-22ac585a73e5?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1522748906645-95d8ad85fa4b?auto=format&fit=crop&w=800&q=80',
                ]
            }
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
        visits: [
            {
                id: 'v4',
                date: '01 Nov 2025',
                coverPhoto: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=200&q=80',
                photos: [
                    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80',
                ]
            }
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
        visits: [
            {
                id: 'v5',
                date: '20 Feb 2026',
                coverPhoto: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=200&q=80',
                photos: [
                    'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80',
                ]
            },
            {
                id: 'v6',
                date: '10 Feb 2026',
                coverPhoto: 'https://images.unsplash.com/photo-1514066558159-fc8c737ef259?auto=format&fit=crop&w=200&q=80',
                photos: [
                    'https://images.unsplash.com/photo-1514066558159-fc8c737ef259?auto=format&fit=crop&w=800&q=80',
                ]
            },
            {
                id: 'v7',
                date: '01 Ene 2026',
                coverPhoto: 'https://images.unsplash.com/photo-1445116572660-236099ae4624?auto=format&fit=crop&w=200&q=80',
                photos: [
                    'https://images.unsplash.com/photo-1445116572660-236099ae4624?auto=format&fit=crop&w=800&q=80',
                ]
            }
        ]
    }
];

const ALL_POSSIBLE_FILTERS = [
    { id: 'todos', label: 'Todos', icon: 'favorite' },
    { id: 'cine', label: 'Cine', icon: 'movie' },
    { id: 'comida', label: 'Comida', icon: 'restaurant' },
    { id: 'romántico', label: 'Romántico', icon: 'local_florist' },
    { id: 'aventura', label: 'Aventura', icon: 'hiking' },
    { id: 'relajación', label: 'Relajación', icon: 'spa' },
    { id: 'fiesta', label: 'Fiesta', icon: 'celebration' },
    { id: 'misterioso', label: 'Misterioso', icon: 'help_center' }
];

const MOCK_PENDING_DATES = [
    {
        id: 'pnd1',
        originalDate: 'Hoy, 6:00 PM',
        coverPhoto: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80',
        photos: [
            'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
            'https://images.unsplash.com/photo-1585647347384-2593bc35786b'
        ],
        isFromBingo: false,
    },
    {
        id: 'pnd2',
        originalDate: 'Ayer, 8:30 PM',
        coverPhoto: 'https://images.unsplash.com/photo-1582216669966-22ac585a73e5?auto=format&fit=crop&w=200&q=80',
        photos: [
            'https://images.unsplash.com/photo-1582216669966-22ac585a73e5'
        ],
        suggestedTags: ['romántico', 'comida'],
        isFromBingo: true,
    }
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

// Track map events: zoom and click to dismiss search
function MapEvents({ setMapZoom, onMapClick }) {
    useMapEvents({
        zoomend(e) {
            setMapZoom(e.target.getZoom());
        },
        click() {
            if (onMapClick) onMapClick();
        }
    });
    return null;
}

// Build custom Leaflet div icon per place type
function buildIcon(place, isSelected, zoom) {
    let size = 'small';
    if (place.visitCount >= 5) size = 'large';
    else if (place.visitCount >= 2) size = 'medium';

    const scale = zoom >= 14 ? 1 : zoom >= 12 ? 0.7 : zoom >= 10 ? 0.45 : 0.25;

    // At very low zoom levels, strip down large/medium pins
    const isLowZoom = zoom < 10;
    const hideIcon = zoom < 12;
    const hidePulse = zoom < 13;

    // Force small solid dot at very low zoom
    if (isLowZoom) {
        size = 'micro'; // A new internal size specifically for zoomed out map
    }

    // Apply scale to anchor and size logic
    let iconSize, iconAnchor, popupAnchor;

    if (size === 'large') {
        iconSize = [70 * scale, 70 * scale];
        iconAnchor = [35 * scale, 62 * scale];
        popupAnchor = [0, -60 * scale];
    } else if (size === 'medium') {
        iconSize = [46 * scale, 46 * scale];
        iconAnchor = [23 * scale, 40 * scale];
        popupAnchor = [0, -35 * scale];
    } else if (size === 'small') {
        iconSize = [30 * scale, 30 * scale];
        iconAnchor = [15 * scale, 26 * scale];
        popupAnchor = [0, -22 * scale];
    } else {
        // 'micro' size for very low zoom
        iconSize = [20, 20]; // Scale is handled mostly by the fixed size in MapPin
        iconAnchor = [10, 10];
        popupAnchor = [0, -10];
    }

    const html = renderToStaticMarkup(
        <div style={{
            width: `${iconSize[0]}px`,
            height: `${iconSize[1]}px`,
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
    );

    return L.divIcon({
        className: '',
        html: html,
        iconSize: iconSize,
        iconAnchor: iconAnchor,
        popupAnchor: popupAnchor,
    });
}

export default function UserLugares({ onPlaceSelected, bingoContextToMap, clearBingoContext }) {
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [activeFilter, setActiveFilter] = useState('todos');
    const [citaContext, setCitaContext] = useState(null);
    const [globalSettings, setGlobalSettings] = useState(null);
    const [mapZoom, setMapZoom] = useState(13); // Default initial zoom

    useEffect(() => {
        const unsub = subscribeToGlobalSettings(data => {
            if (data) setGlobalSettings(data);
        });
        return unsub;
    }, []);

    useEffect(() => {
        if (bingoContextToMap) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCitaContext(bingoContextToMap);
            if (clearBingoContext) clearBingoContext();
            // Hide the bottom navbar immediately when cita opens from bingo
            if (onPlaceSelected) onPlaceSelected(true);
        }
    }, [bingoContextToMap, clearBingoContext, onPlaceSelected]);

    // Pending Dates state
    const [pendingDates, setPendingDates] = useState(MOCK_PENDING_DATES);
    const [isPendingListOpen, setIsPendingListOpen] = useState(false);
    const [selectedPendingDate, setSelectedPendingDate] = useState(null);

    // Photo viewer state
    const [viewerPhotos, setViewerPhotos] = useState(null);

    // Search state
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // --- NAVBAR & OVERLAY LOGIC ---
    useEffect(() => {
        const isAnyOverlayOpen = !!citaContext || isPendingListOpen || !!selectedPendingDate || !!selectedPlace || isSearchActive;
        if (onPlaceSelected) {
            onPlaceSelected(isAnyOverlayOpen);
        }
    }, [citaContext, isPendingListOpen, selectedPendingDate, selectedPlace, isSearchActive, onPlaceSelected]);
    // ----------------------------

    const filteredPlaces = MOCK_PLACES.filter(p => {
        const matchesFilter = activeFilter === 'todos' || p.tags.includes(activeFilter);
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    // Calculate dynamic filters based on currently available tags in MOCK_PLACES
    const availableTags = new Set();
    MOCK_PLACES.forEach(place => {
        place.tags?.forEach(tag => availableTags.add(tag));
    });

    const activeFilters = ALL_POSSIBLE_FILTERS.filter(
        opt => opt.id === 'todos' || availableTags.has(opt.id)
    );

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
                    className={styles.map}
                >
                    <MapEvents
                        setMapZoom={setMapZoom}
                        onMapClick={() => {
                            if (isSearchActive) setIsSearchActive(false);
                            // Also close drawer if clicking map
                            if (selectedPlace) {
                                setSelectedPlace(null);
                                if (onPlaceSelected) onPlaceSelected(false);
                            }
                        }}
                    />
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
                            icon={buildIcon(place, selectedPlace?.id === place.id, mapZoom)}
                            eventHandlers={{
                                click: () => {
                                    const newPlace = selectedPlace?.id === place.id ? null : place;
                                    setSelectedPlace(newPlace);
                                    if (onPlaceSelected) onPlaceSelected(!!newPlace);
                                }
                            }}
                        />
                    ))}
                </MapContainer>
            </div>

            {/* ── OVERLAY LAYER (all UI lives here, above map) ── */}
            <div className={styles.overlay}>

                {/* Top Controls: Search & Filters */}
                <div className={styles.topControls}>
                    <div className={`${styles.searchWrapper} ${isSearchActive ? styles.searchWrapperActive : ''}`}>
                        {isSearchActive ? (
                            <div className={styles.searchContainer}>
                                <KawaiiInput
                                    type="search"
                                    placeholder="Buscar lugar..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                    onClear={() => {
                                        setIsSearchActive(false);
                                        setSearchQuery('');
                                    }}
                                />
                            </div>
                        ) : (
                            <button
                                className={styles.searchFabBtn}
                                type="button"
                                aria-label="Buscar lugar"
                                onClick={() => setIsSearchActive(true)}
                            >
                                <span className="material-symbols-outlined">search</span>
                            </button>
                        )}
                    </div>

                    <AnimatePresence>
                        {!isSearchActive && (
                            <motion.div
                                className={styles.filtersScroll}
                                initial={{ opacity: 0, scale: 0.95, width: 0 }}
                                animate={{ opacity: 1, scale: 1, width: 'auto' }}
                                exit={{ opacity: 0, scale: 0.95, width: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                {activeFilters.map(opt => (
                                    <button
                                        key={opt.id}
                                        className={`${styles.chip} ${activeFilter === opt.id ? styles.chipActive : ''}`}
                                        onClick={() => {
                                            setActiveFilter(opt.id);
                                            setSelectedPlace(null);
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
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Actions Stack: Grouped to prevent overlaps */}
                <div className={styles.actionsStack}>
                    {/* Warning Button for Pending Dates: visible even in search or when place selected, unless list/form open */}
                    <AnimatePresence>
                        {!isSearchActive && !isPendingListOpen && !selectedPendingDate && pendingDates.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                            >
                                <PendingWarningBtn
                                    pendingCount={pendingDates.length}
                                    isVisible={true}
                                    onClick={() => setIsPendingListOpen(true)}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* FAB — Date Mode Button: hidden if searching, cita open, or place selected */}
                    <AnimatePresence>
                        {!isSearchActive && !citaContext && !selectedPlace && !isPendingListOpen && !selectedPendingDate && (
                            <motion.div
                                className={styles.fab}
                                initial={{ opacity: 0, scale: 0.5, y: 50 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.5, y: 50 }}
                                transition={{ type: 'spring', damping: 15, stiffness: 250 }}
                            >
                                <button className={styles.fabBtn} onClick={() => {
                                    const minVal = globalSettings?.citaConfig?.minPhotosSpontaneous || 5;
                                    setCitaContext({ type: 'spontaneous', minPhotos: minVal });
                                }}>
                                    <span className="material-symbols-outlined">camera_alt</span>
                                </button>
                                <span className={styles.fabLabel}>Estamos de cita ✨</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Place detail drawer */}
                {!citaContext && !isSearchActive && (
                    <div className={`${styles.drawer} ${selectedPlace ? styles.drawerOpen : ''}`}>
                        <div className={styles.drawerContent}>
                            <div className={styles.drawerHandle} />

                            <div className={styles.placeRow}>
                                <div className={styles.placeTitleGroup}>
                                    <div className={styles.placeTitleWrapper}>
                                        <span className={styles.placeEmoji}>{selectedPlace?.emoji}</span>
                                        <h2 className={styles.placeName}>{selectedPlace?.name}</h2>
                                    </div>
                                    <div className={styles.tagsDisplay}>
                                        {selectedPlace?.tags?.map(t => (
                                            <span key={t} className={styles.tag}>{t}</span>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    className={styles.closeDrawer}
                                    onClick={() => {
                                        setSelectedPlace(null);
                                        if (onPlaceSelected) onPlaceSelected(false);
                                    }}
                                    aria-label="Cerrar"
                                >
                                    <span className="material-symbols-outlined">keyboard_arrow_down</span>
                                </button>
                            </div>

                            <div className={styles.photosGrid}>
                                {(selectedPlace?.visits?.length || 0) <= 2 ? (
                                    // 1 or 2 visits: side by side
                                    selectedPlace?.visits?.map((visit) => (
                                        <div key={visit.id} className={styles.photoWrapHorizontal}>
                                            <img
                                                src={visit.coverPhoto}
                                                alt=""
                                                className={styles.photoGridImg}
                                                onClick={() => setViewerPhotos(visit.photos)}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.parentElement.style.background = '#e8f7f0';
                                                    e.target.parentElement.innerHTML = '<span class="material-symbols-outlined" style="color:#88d8b0;font-size:28px;display:flex;align-items:center;justify-content:center;height:100%">image_not_supported</span>';
                                                }}
                                            />
                                            <div className={styles.visitDateBadge}>
                                                <span className="material-symbols-outlined">calendar_month</span> {visit.date}
                                            </div>
                                        </div>
                                    ))
                                ) : selectedPlace?.visits?.length === 3 ? (
                                    // Exactly 3 visits: 1 large left, 2 stacked right
                                    <>
                                        <div className={styles.photoWrapLargeLeft}>
                                            <img src={selectedPlace.visits[0].coverPhoto} alt="" className={styles.photoGridImg}
                                                onClick={() => setViewerPhotos(selectedPlace.visits[0].photos)}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.parentElement.style.background = '#e8f7f0';
                                                    e.target.parentElement.innerHTML = '<span class="material-symbols-outlined" style="color:#88d8b0;font-size:28px;display:flex;align-items:center;justify-content:center;height:100%">image_not_supported</span>';
                                                }} />
                                            <div className={styles.visitDateBadge}>
                                                <span className="material-symbols-outlined">calendar_month</span> {selectedPlace.visits[0].date}
                                            </div>
                                        </div>
                                        <div className={styles.photoWrapStackedRight}>
                                            <div className={styles.photoWrapSmall}>
                                                <img src={selectedPlace.visits[1].coverPhoto} alt="" className={styles.photoGridImg}
                                                    onClick={() => setViewerPhotos(selectedPlace.visits[1].photos)}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.parentElement.style.background = '#e8f7f0';
                                                        e.target.parentElement.innerHTML = '<span class="material-symbols-outlined" style="color:#88d8b0;font-size:28px;display:flex;align-items:center;justify-content:center;height:100%">image_not_supported</span>';
                                                    }} />
                                                <div className={styles.visitDateBadgeSmall}>
                                                    {selectedPlace.visits[1].date}
                                                </div>
                                            </div>
                                            <div className={styles.photoWrapSmall}>
                                                <img src={selectedPlace.visits[2].coverPhoto} alt="" className={styles.photoGridImg}
                                                    onClick={() => setViewerPhotos(selectedPlace.visits[2].photos)}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.parentElement.style.background = '#e8f7f0';
                                                        e.target.parentElement.innerHTML = '<span class="material-symbols-outlined" style="color:#88d8b0;font-size:28px;display:flex;align-items:center;justify-content:center;height:100%">image_not_supported</span>';
                                                    }} />
                                                <div className={styles.visitDateBadgeSmall}>
                                                    {selectedPlace.visits[2].date}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    // 4 or more visits: 2x2 grid
                                    selectedPlace?.visits?.slice(0, 4).map((visit, i) => (
                                        <div key={visit.id} className={styles.photoWrapGridItem}>
                                            <img src={visit.coverPhoto} alt="" className={styles.photoGridImg}
                                                onClick={() => setViewerPhotos(visit.photos)}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.parentElement.style.background = '#e8f7f0';
                                                    e.target.parentElement.innerHTML = '<span class="material-symbols-outlined" style="color:#88d8b0;font-size:28px;display:flex;align-items:center;justify-content:center;height:100%">image_not_supported</span>';
                                                }} />

                                            {i === 3 && selectedPlace.visits.length > 4 ? (
                                                <div className={styles.photoMoreOverlay} onClick={() => setViewerPhotos(visit.photos)}>
                                                    +{selectedPlace.visits.length - 4} citas
                                                </div>
                                            ) : (
                                                <div className={styles.visitDateBadgeSmall}>
                                                    {visit.date}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className={styles.statsRow}>
                                <div className={styles.statItemMint}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>photo_library</span>
                                    {selectedPlace?.visits?.reduce((acc, visit) => acc + visit.photos.length, 0) || 0} fotos
                                </div>
                                <div className={styles.statItemGray}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>calendar_month</span>
                                    {selectedPlace?.lastVisitDate}
                                </div>
                                <div className={styles.statItemRose}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>favorite</span>
                                    {selectedPlace?.visitCount} visitas
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modo Cita */}
                {citaContext && (
                    <CitaOverlay
                        citaContext={citaContext}
                        onClose={() => {
                            setCitaContext(null);
                            if (onPlaceSelected) onPlaceSelected(false);
                        }}
                        onSave={(photos) => {
                            setCitaContext(null);
                            if (onPlaceSelected) onPlaceSelected(false);

                            if (photos && photos.length > 0) {
                                const newPendingDate = {
                                    id: `pnd_${Date.now()}`,
                                    originalDate: new Date().toLocaleString(),
                                    coverPhoto: photos[0],
                                    photos: photos,
                                    isFromBingo: !!citaContext.bingoLabel,
                                    suggestedTags: citaContext.tags || []
                                };
                                setPendingDates(prev => [...prev, newPendingDate]);
                                toast.success('¡Cita guardada! 📸', `${photos.length} foto${photos.length !== 1 ? 's' : ''} en tus borradores`);
                            } else {
                                toast.info('Cita finalizada', 'Sin fotos esta vez.');
                            }
                        }}
                    />
                )}


                {/* Pending Dates Overlays */}
                <AnimatePresence>
                    {isPendingListOpen && !selectedPendingDate && (
                        <PendingDatesList
                            pendingDates={pendingDates}
                            onClose={() => setIsPendingListOpen(false)}
                            onSelectDate={(pd) => setSelectedPendingDate(pd)}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {selectedPendingDate && (
                        <PendingDateForm
                            pendingDate={selectedPendingDate}
                            defaultPlaces={MOCK_PLACES}
                            onClose={() => setSelectedPendingDate(null)}
                            onSave={(finalData) => {
                                setSelectedPendingDate(null);
                                if (pendingDates.length === 1) setIsPendingListOpen(false);
                                setPendingDates(prev => prev.filter(p => p.id !== finalData.id));
                                toast.success('¡Cita guardada!', 'El recuerdo se añadió al historial ✨');
                            }}
                        />
                    )}
                </AnimatePresence>

                {/* Photo Viewer Modal */}
                <PhotoViewer photos={viewerPhotos} onClose={() => setViewerPhotos(null)} />
            </div>
        </div>
    );
}
