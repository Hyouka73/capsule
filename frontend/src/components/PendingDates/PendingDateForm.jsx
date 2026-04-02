import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import KawaiiInput from '../ui/KawaiiInput/KawaiiInput';
import KawaiiSwitch from '../ui/KawaiiSwitch/KawaiiSwitch';
import PlacePickerBottomSheet from './PlacePickerBottomSheet';
import { reverseGeocode } from '../../services/mapService';
import Carousel from '../ui/Carousel/Carousel';
import { useBingo } from '../../hooks/useBingo';
import { useAppConfig } from '../../context/AppConfigContext';
import styles from './PendingDateForm.module.css';

export default function PendingDateForm({ pendingDate, onClose, onSave, onAutoSave, defaultPlaces }) {
    const { availableTags } = useBingo();
    const { memoryTags } = useAppConfig();
    
    // Determine initial location from metadata if available
    const [selectedPlaceId, setSelectedPlaceId] = useState(() => 
        pendingDate?.coordinates ? 'custom_map' : ''
    );
    const [customLocation, setCustomLocation] = useState(pendingDate?.coordinates || null);
    const [customPlaceName, setCustomPlaceName] = useState(pendingDate?.placeName || '');
    const [isPlacePickerOpen, setIsPlacePickerOpen] = useState(false);
    const [title, setTitle] = useState(pendingDate?.title || '');
    
    const [eventDate, setEventDate] = useState(() => {
        try {
            // Priority: eventDate from form > rawDate from EXIF > createdAt
            const dateToUse = pendingDate?.eventDate || pendingDate?.rawDate || pendingDate?.createdAt;
            if (dateToUse) {
                const d = new Date(dateToUse);
                if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
            }
        } catch (e) {
            // silent fail
        }
        return new Date().toISOString().split('T')[0];
    });

    const [selectedTags, setSelectedTags] = useState(pendingDate?.tags || pendingDate?.suggestedTags || pendingDate?.context?.tags || []);
    const [isSpecial, setIsSpecial] = useState(pendingDate?.isSpecial || false);
    const [comments, setComments] = useState(pendingDate?.description || pendingDate?.comments || pendingDate?.context?.description || '');
    const [locationError, setLocationError] = useState(false);
    const [showCarousel, setShowCarousel] = useState(false);

    // ── Global Config Tags Only ──
    const allAvailableTags = useMemo(() => {
        return memoryTags || [];
    }, [memoryTags]);

    // Auto-save debounced
    useEffect(() => {
        if (!onAutoSave) return;
        
        const timer = setTimeout(() => {
            const hasData = title || selectedTags.length > 0 || comments || selectedPlaceId || isSpecial;
            if (hasData) {
                onAutoSave({
                    id: pendingDate.id,
                    title,
                    eventDate,
                    tags: selectedTags,
                    comments,
                    placeId: selectedPlaceId,
                    placeName: selectedPlaceId === 'custom_map' ? customPlaceName : null,
                    customLocation,
                    isSpecial
                });
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [title, eventDate, selectedTags, comments, selectedPlaceId, customLocation, customPlaceName, isSpecial, onAutoSave, pendingDate.id]);

    // Auto-resolve place name if coordinates exist but name doesn't
    useEffect(() => {
        if (customLocation && !customPlaceName) {
            reverseGeocode(customLocation.lat, customLocation.lng)
                .then(res => {
                    if (res && res.name) {
                        setCustomPlaceName(res.name);
                    }
                })
                .catch(err => { /* silent fail */ });
        }
    }, [customLocation, customPlaceName]);

    const toggleTag = (tag) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    if (!pendingDate) return null;

    const handleSave = () => {
        if (!selectedPlaceId && !customLocation) {
            setLocationError(true);
            return;
        }

        onSave({
            ...pendingDate,
            title: title || 'Recuerdo sin título',
            eventDate: eventDate,
            placeId: selectedPlaceId,
            placeName: selectedPlaceId === 'custom_map' ? customPlaceName : null,
            customLocation: customLocation,
            tags: selectedTags,
            comments: comments,
            isSpecial
        });
    };

    return (
        <motion.div
            className={styles.overlay}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
            <div className={styles.orbTopLeft}></div>

            <div className={styles.scrollArea}>
                <div className={styles.contentWrapper}>
                    <div className={styles.header}>
                        <button className={styles.backBtn} onClick={onClose}>
                            <span className="material-symbols-rounded">arrow_back</span>
                        </button>
                        <h2 className={styles.title}>Clasificar cita</h2>
                    </div>

                    <div className={styles.heroSection} onClick={() => setShowCarousel(true)}>
                        <img src={pendingDate.coverPhoto} alt="Cover" className={styles.heroImg} />
                        <div className={styles.heroBadge}>
                            <span className="material-symbols-rounded" style={{fontSize:'12px', verticalAlign:'middle', marginRight:'4px'}}>photo_library</span>
                            {pendingDate.photos?.length || 0} fotos
                        </div>
                        <div className={styles.heroOverlay}>
                            <span className="material-symbols-rounded">zoom_in</span>
                            Toca para ver todas
                        </div>
                    </div>

                    <AnimatePresence>
                        {showCarousel && (
                            <motion.div 
                                className={styles.carouselOverlay}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <Carousel 
                                    items={pendingDate.photos?.map(p => p.objectUrl) || [pendingDate.coverPhoto]} 
                                    onBack={() => setShowCarousel(false)} 
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className={styles.formGroup}>
                        <KawaiiInput
                            label="¿Qué título le pondrías?"
                            iconLeft="edit"
                            placeholder="Ej. Nuestra cena especial"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <KawaiiInput
                            type="date"
                            label="¿Cuándo fue esta magia?"
                            iconLeft="calendar_today"
                            value={eventDate}
                            onChange={e => setEventDate(e.target.value)}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>¿Dónde fue?</label>
                        {selectedPlaceId === 'custom_map' && customLocation ? (
                            <div className={styles.confirmedLocationBadge}>
                                <div className={styles.confirmedLeft}>
                                    <div className={styles.checkCircle}>
                                        <span className="material-symbols-rounded">check</span>
                                    </div>
                                    <div className={styles.locationMeta}>
                                        <span className={styles.locationLabel}>
                                            {customPlaceName || 'Ubicación de la foto'}
                                        </span>
                                        <span className={styles.locationCoords}>
                                            {customLocation.lat.toFixed(4)}, {customLocation.lng.toFixed(4)}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    className={styles.editLocationBtn}
                                    onClick={() => setIsPlacePickerOpen(true)}
                                >
                                    <span className="material-symbols-rounded">edit_location_alt</span>
                                    Cambiar
                                </button>
                            </div>
                        ) : (
                            <KawaiiInput
                                type="select"
                                label=""
                                iconLeft="location_on"
                                placeholder="Toca aquí para elegir el lugar"
                                value={selectedPlaceId}
                                onClick={() => {
                                    setLocationError(false);
                                    setIsPlacePickerOpen(true);
                                }}
                                error={locationError ? "Por favor selecciona una ubicación para continuar" : null}
                                options={[
                                    ...(defaultPlaces?.map(p => ({ value: p.id, label: `${p.emoji} ${p.name}` })) || []),
                                    ...(customLocation ? [{ value: 'custom_map', label: '📍 Ubicación elegida en mapa' }] : [])
                                ]}
                            />
                        )}
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Etiquetas</label>
                        <div className={styles.tagsContainer}>
                            {allAvailableTags.length > 0 ? (
                                allAvailableTags.map((tag) => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        className={`${styles.tagBtn} ${selectedTags.includes(tag.id) ? styles.tagBtnActive : ''}`}
                                        onClick={() => toggleTag(tag.id)}
                                    >
                                        {tag.emoji} {tag.label}
                                    </button>
                                ))
                            ) : (
                                <p className={styles.noTags}>Configura etiquetas en el administrador ✨</p>
                            )}
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <KawaiiSwitch 
                            checked={isSpecial} 
                            onChange={setIsSpecial} 
                            label="¿Es un Especial? ⭐" 
                            icon="👑"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <KawaiiInput
                            type="textarea"
                            label={
                                <>
                                    Alguna nota especial
                                    <span className={styles.optionalBadge}>(Opcional)</span>
                                </>
                            }
                            placeholder="Escribe aquí algún chiste local o algo que no quieras olvidar..."
                            value={comments}
                            onChange={e => setComments(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {(pendingDate.isFromBingo || pendingDate.context?.type === 'bingo') && (
                        <div className={styles.bingoBanner}>
                            <span className="material-symbols-rounded">casino</span>
                            ¡Esta cita desbloquea un reto! ✨
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.footer}>
                <button
                    className={styles.saveBtn}
                    onClick={handleSave}
                    disabled={!selectedPlaceId && !customLocation}
                >
                    <span>Guardar este recuerdo</span>
                    <span className="material-symbols-rounded">favorite</span>
                </button>
            </div>

            <PlacePickerBottomSheet
                isOpen={isPlacePickerOpen}
                onClose={() => setIsPlacePickerOpen(false)}
                places={defaultPlaces || []}
                onSelectPlace={(placeId) => {
                    setSelectedPlaceId(placeId);
                    setCustomLocation(null);
                }}
                onLocationSelected={(locationData, placeId, placeName) => {
                    if (placeId) {
                        setSelectedPlaceId(placeId);
                        setCustomLocation(null);
                        setCustomPlaceName('');
                    } else {
                        setCustomLocation(locationData);
                        setCustomPlaceName(placeName || '');
                        setSelectedPlaceId('custom_map');
                    }
                }}
                initialCoordinates={pendingDate.coordinates}
            />
        </motion.div>
    );
}
