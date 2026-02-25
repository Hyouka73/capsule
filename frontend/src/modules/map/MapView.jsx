import { useState, useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import PhotoViewer from '../../components/ui/PhotoViewer/PhotoViewer';
import MapPin from '../../components/ui/MapPin/MapPin';
import KawaiiInput from '../../components/ui/KawaiiInput/KawaiiInput';
import PendingDatesList from '../../components/PendingDates/PendingDatesList';
import PendingDateForm from '../../components/PendingDates/PendingDateForm';
import CitaOverlay from '../../components/Cita/CitaOverlay';
import { subscribeToGlobalSettings } from '../../services/settingsService';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import SnapshotButton from '../snapshots/components/SnapshotButton';
import { useAuth } from '../../hooks/useAuth';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './MapView.module.css';

// Fix leaflet default icon paths broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

import { MOCK_PLACES, ALL_POSSIBLE_FILTERS, MOCK_PENDING_DATES } from '../../data/mapData';

// Fly to a selected place
function FlyToPlace({ place }) {
    const map = useMap();
    if (place) {
        map.flyTo([place.coordinates.lat - 0.005, place.coordinates.lng], 15, { duration: 1.2, easeLinearity: 0.25 });
    }
    return null;
}

// Track map events
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

// Build custom Leaflet div icon
function buildIcon(place, isSelected, zoom) {
    let size = 'small';
    if (place.visitCount >= 5) size = 'large';
    else if (place.visitCount >= 2) size = 'medium';

    const scale = zoom >= 14 ? 1 : zoom >= 12 ? 0.7 : zoom >= 10 ? 0.45 : 0.25;
    const isLowZoom = zoom < 10;
    const hideIcon = zoom < 12;
    const hidePulse = zoom < 13;

    if (isLowZoom) size = 'micro';

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
        iconSize = [20, 20];
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

export default function MapView({
    onPlaceSelected,
    bingoContextToMap,
    clearBingoContext,
    openPendingSignal,
    onPendingSignalHandled
}) {
    const { isPartner, isAdmin } = useAuth();
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [activeFilter, setActiveFilter] = useState('todos');
    const [citaContext, setCitaContext] = useState(null);
    const [globalSettings, setGlobalSettings] = useState(null);
    const [mapZoom, setMapZoom] = useState(13);

    useEffect(() => {
        const unsub = subscribeToGlobalSettings(data => {
            if (data) setGlobalSettings(data);
        });
        return unsub;
    }, []);

    useEffect(() => {
        if (bingoContextToMap) {
            setCitaContext(bingoContextToMap);
            if (clearBingoContext) clearBingoContext();
            if (onPlaceSelected) onPlaceSelected(true);
        }
    }, [bingoContextToMap, clearBingoContext, onPlaceSelected]);

    const [pendingDates] = useState(MOCK_PENDING_DATES);
    const [isPendingListOpen, setIsPendingListOpen] = useState(false);
    const [selectedPendingDate, setSelectedPendingDate] = useState(null);
    const [viewerPhotos, setViewerPhotos] = useState(null);
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Handle quick access signal from Navbar
    useEffect(() => {
        if (openPendingSignal) {
            setIsPendingListOpen(true);
            if (onPendingSignalHandled) onPendingSignalHandled();
        }
    }, [openPendingSignal, onPendingSignalHandled]);

    useEffect(() => {
        const isAnyOverlayOpen = !!citaContext || isPendingListOpen || !!selectedPendingDate || !!selectedPlace || isSearchActive;
        if (onPlaceSelected) onPlaceSelected(isAnyOverlayOpen);
    }, [citaContext, isPendingListOpen, selectedPendingDate, selectedPlace, isSearchActive, onPlaceSelected]);

    const filteredPlaces = MOCK_PLACES.filter(p => {
        const matchesFilter = activeFilter === 'todos' || p.tags.includes(activeFilter);
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const availableTags = new Set();
    MOCK_PLACES.forEach(place => place.tags?.forEach(tag => availableTags.add(tag)));

    const activeFilters = ALL_POSSIBLE_FILTERS.filter(
        opt => opt.id === 'todos' || availableTags.has(opt.id)
    );

    return (
        <div className={styles.screen}>
            {/* ── THE MAP ── */}
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
                        </div>
                    )}

                    {/* Snapshot Button — Residencia original */}
                    {(isPartner || isAdmin) && !isSearchActive && (
                        <SnapshotButton variant="map" />
                    )}
                </div>


                {/* Actions Stack: Bottom Right */}
                <div className={styles.actionsStack}>
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
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            {selectedPlace?.photos?.length > 0 && (
                                <div className={styles.photosGrid}>
                                    {selectedPlace.photos.slice(0, 4).map((img, idx) => (
                                        <div key={idx} className={styles.photoWrapGridItem} onClick={() => setViewerPhotos(selectedPlace.photos)}>
                                            <img src={img} className={styles.photoGridImg} alt="" />
                                            {idx === 3 && selectedPlace.photos.length > 4 && (
                                                <div className={styles.photoMoreOverlay}>+{selectedPlace.photos.length - 4}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modals & Overlays ── */}
            <AnimatePresence>
                {isPendingListOpen && (
                    <PendingDatesList
                        pendingDates={pendingDates}
                        onClose={() => setIsPendingListOpen(false)}
                        onSelectDate={(date) => {
                            setSelectedPendingDate(date);
                            setIsPendingListOpen(false);
                        }}
                    />
                )}
                {selectedPendingDate && (
                    <PendingDateForm
                        pendingDate={selectedPendingDate}
                        onClose={() => setSelectedPendingDate(null)}
                    />
                )}
                {citaContext && (
                    <CitaOverlay
                        context={citaContext}
                        onClose={() => {
                            setCitaContext(null);
                            if (onPlaceSelected) onPlaceSelected(false);
                        }}
                    />
                )}
            </AnimatePresence>

            {viewerPhotos && (
                <PhotoViewer
                    photos={viewerPhotos}
                    onClose={() => setViewerPhotos(null)}
                />
            )}
        </div>
    );
}
