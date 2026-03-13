import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import KawaiiInput from '../ui/KawaiiInput/KawaiiInput';
import Button from '../ui/Button/Button';
import MapLocationPicker from './MapLocationPicker';
import styles from './PlacePickerBottomSheet.module.css';

export default function PlacePickerBottomSheet({
    isOpen,
    onClose,
    places,
    onSelectPlace,
    onLocationSelected, // Gets raw coordinates/data from map
    initialCoordinates // from pendingDate if any
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [selectedId, setSelectedId] = useState('');
    const [mapPreviewCoords, setMapPreviewCoords] = useState(null);

    // Reset map state when closing the bottom sheet
    useEffect(() => {
        if (!isOpen) {
            setIsMapOpen(false);
            setSearchTerm('');
            setSelectedId('');
            setMapPreviewCoords(null);
        }
    }, [isOpen]);

    const filteredPlaces = places.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleMapConfirm = (locationData, placeId, placeName) => {
        onLocationSelected(locationData, placeId, placeName);
        setIsMapOpen(false);
        onClose();
    };

    return (
        <motion.div
            className={styles.overlay}
            initial={false}
            animate={{
                opacity: isOpen ? 1 : 0,
                pointerEvents: isOpen ? 'auto' : 'none'
            }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
        >
            <motion.div
                className={styles.bottomSheet}
                initial={false}
                animate={{ y: isOpen ? 0 : '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    {/* Map View */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        opacity: isMapOpen ? 1 : 0,
                        pointerEvents: isMapOpen ? 'auto' : 'none',
                        transition: 'opacity 0.2s',
                        display: 'flex', flexDirection: 'column'
                    }}>
                        <MapLocationPicker
                            onConfirm={handleMapConfirm}
                            onCancel={() => {
                                setIsMapOpen(false);
                                setMapPreviewCoords(null);
                            }}
                            initialCoordinates={mapPreviewCoords || initialCoordinates}
                        />
                    </div>

                    {/* List View */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        opacity: isMapOpen ? 0 : 1,
                        pointerEvents: isMapOpen ? 'none' : 'auto',
                        transition: 'opacity 0.2s',
                        display: 'flex', flexDirection: 'column'
                    }}>
                        <div className={styles.header}>
                            <div className={styles.handle} />
                            <h3>Selecciona un lugar</h3>
                            <button className={styles.closeBtn} onClick={onClose}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className={styles.searchSection}>
                            <KawaiiInput
                                type="search"
                                placeholder="Buscar lugar..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                onClear={() => setSearchTerm('')}
                            />
                            <Button
                                variant="secondary"
                                className={styles.mapBtn}
                                onClick={() => setIsMapOpen(true)}
                            >
                                <span className={`material-symbols-outlined ${styles.mapIcon}`}>map</span>
                                Elegir en el mapa
                            </Button>
                        </div>

                        <div className={styles.placesList}>
                            {filteredPlaces.length > 0 ? (
                                filteredPlaces.map(place => (
                                    <div
                                        key={place.id}
                                        className={`${styles.placeItem} ${selectedId === place.id ? styles.placeItemActive : ''}`}
                                        onClick={() => {
                                            setSelectedId(place.id);
                                            // Focus map on this place if coords exist
                                            if (place.lat && place.lng) {
                                                setMapPreviewCoords({ lat: place.lat, lng: place.lng });
                                                setIsMapOpen(true);
                                            }
                                        }}
                                        onDoubleClick={() => {
                                            onSelectPlace(place.id);
                                            onClose();
                                        }}
                                        role="button"
                                        aria-pressed={selectedId === place.id}
                                        tabIndex={0}
                                    >
                                        <div className={styles.placeEmoji}>{place.emoji}</div>
                                        <div className={styles.placeInfo}>
                                            <span className={styles.placeName}>{place.name}</span>
                                            {place.tags && place.tags.length > 0 && (
                                                <span className={styles.placeTags}>
                                                    {place.tags.join(' • ')}
                                                </span>
                                            )}
                                        </div>
                                        {selectedId === place.id && (
                                            <span className={`material-symbols-outlined ${styles.checkIcon}`}>check_circle</span>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className={styles.emptyState}>
                                    <span className={styles.emptyIcon}>🙈</span>
                                    <p>No encontramos ese lugar.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer with Selection Button */}
                        <div className={styles.footer}>
                            <Button
                                className={styles.confirmBtn}
                                onClick={() => {
                                    if (selectedId) {
                                        onSelectPlace(selectedId);
                                        onClose();
                                    }
                                }}
                                disabled={!selectedId}
                            >
                                Seleccionar este lugar
                                <span className="material-symbols-outlined">done_all</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
