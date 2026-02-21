import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import PhotoViewer from '../../components/ui/PhotoViewer/PhotoViewer';
import CitaOverlay from './components/CitaOverlay/CitaOverlay';
import PendingWarningBtn from './components/PendingDates/PendingWarningBtn';
import PendingDatesList from './components/PendingDates/PendingDatesList';
import PendingDateForm from './components/PendingDates/PendingDateForm';
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

export default function UserLugares({ onPlaceSelected }) {
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [activeFilter, setActiveFilter] = useState('todos');
    const [citaContext, setCitaContext] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);

    // Pending Dates state
    const [pendingDates, setPendingDates] = useState(MOCK_PENDING_DATES);
    const [isPendingListOpen, setIsPendingListOpen] = useState(false);
    const [selectedPendingDate, setSelectedPendingDate] = useState(null);

    // Photo viewer state
    const [viewerPhotos, setViewerPhotos] = useState(null);

    // Search state
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

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
                    scrollWheelZoom={true}
                    doubleClickZoom={true}
                    touchZoom={true}
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

                    {/* Warning Button for Pending Dates */}
                    {!isSearchActive && !citaContext && !selectedPlace && (
                        <PendingWarningBtn
                            pendingCount={pendingDates.length}
                            isVisible={true}
                            onClick={() => setIsPendingListOpen(true)}
                        />
                    )}
                </div>

                {/* FAB */}
                {!citaContext && !selectedPlace && (
                    <div className={styles.fab}>
                        <button className={styles.fabBtn} onClick={() => {
                            setCitaContext({ type: 'spontaneous', minPhotos: 5 });
                            if (onPlaceSelected) onPlaceSelected(true);
                        }}>
                            <span className="material-symbols-outlined">camera_alt</span>
                        </button>
                        <span className={styles.fabLabel}>Estamos de cita ✨</span>
                    </div>
                )}

                {/* Place detail drawer */}
                {!citaContext && (
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
                        onSave={() => {
                            setCitaContext(null);
                            if (onPlaceSelected) onPlaceSelected(false);
                            showToast("Recuerdo guardado 💚");
                        }}
                    />
                )}

                {/* Toast */}
                {toastMessage && (
                    <div className={styles.toast}>
                        {toastMessage}
                    </div>
                )}

                {/* Pending Dates Overlays */}
                {isPendingListOpen && !selectedPendingDate && (
                    <PendingDatesList
                        pendingDates={pendingDates}
                        onClose={() => setIsPendingListOpen(false)}
                        onSelectDate={(pd) => setSelectedPendingDate(pd)}
                    />
                )}

                {selectedPendingDate && (
                    <PendingDateForm
                        pendingDate={selectedPendingDate}
                        defaultPlaces={MOCK_PLACES}
                        onClose={() => setSelectedPendingDate(null)}
                        onSave={(finalData) => {
                            setSelectedPendingDate(null);
                            if (pendingDates.length === 1) setIsPendingListOpen(false);

                            // Remove from pending
                            setPendingDates(prev => prev.filter(p => p.id !== finalData.id));

                            // To actually alter MOCK_PLACES we would need proper global state,
                            // but for now we just show a success toast.
                            showToast('¡Cita guardada en el historial! ✨');
                        }}
                    />
                )}

                {/* Photo Viewer Modal */}
                <PhotoViewer photos={viewerPhotos} onClose={() => setViewerPhotos(null)} />
            </div>
        </div>
    );
}
