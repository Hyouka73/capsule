import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { useAppConfig } from '../../context/AppConfigContext';
import { useBingo } from '../../hooks/useBingo';
import Button from '../../components/ui/Button/Button';
import KawaiiInput from '../../components/ui/KawaiiInput/KawaiiInput';
import KawaiiSwitch from '../../components/ui/KawaiiSwitch/KawaiiSwitch';
import MediaUploader from '../../components/ui/MediaUploader/MediaUploader';
import PlacePickerBottomSheet from '../../components/PendingDates/PlacePickerBottomSheet';
import styles from './MemoryForm.module.css';
import { toast } from '../../components/ui/PastelToast/PastelToast';

/**
 * MemoryForm - Optimized version with Flat Grid layout.
 * Now using 100% dynamic tags from Config + Bingo.
 */
export default function MemoryForm({ onSuccess, onCancel, initialData = null, bingoOrigin = null, defaultPlaces = [] }) {
    const { relationshipId } = useAuth();
    const { queueMemory } = useOfflineQueue();
    const { memoryTags } = useAppConfig();
    const { availableTags } = useBingo();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [isPlacePickerOpen, setIsPlacePickerOpen] = useState(false);
    const [locationError, setLocationError] = useState(false);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    const [formData, setFormData] = useState(() => {
        const data = initialData || {
            title: '',
            description: '',
            eventDate: new Date().toISOString().split('T')[0],
            tags: [],
            placeName: '',
            placeId: '',
            placeLat: null,
            placeLng: null,
            isSpecial: false,
        };

        // Ensure date is in YYYY-MM-DD format for native picker
        if (data.eventDate) {
            try {
                const datePart = data.eventDate.split('T')[0];
                data.eventDate = datePart;
            } catch (e) {
                data.eventDate = new Date().toISOString().split('T')[0];
            }
        }
        return data;
    });

    const [files, setFiles] = useState(initialData?.photos || []);

    // ── Global Config Tags Only (uses immutable IDs) ──
    const allAvailableTags = useMemo(() => memoryTags || [], [memoryTags]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    const toggleTag = (tag) => {
        setFormData(prev => {
            const currentTags = Array.isArray(prev.tags) ? prev.tags : [];
            return {
                ...prev,
                tags: currentTags.includes(tag)
                    ? currentTags.filter(t => t !== tag)
                    : [...currentTags, tag]
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!relationshipId) {
            setError('No hay una relación activa detectada.');
            return;
        }

        if (!formData.placeId && !formData.placeLat) {
            setLocationError(true);
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await queueMemory(formData, files, null, bingoOrigin);

            if (!isMounted.current) return;

            if (res.queued) {
                toast.success('Recuerdo guardado 💖', 'Se sincronizará en segundo plano ✨');
                onSuccess();
            } else {
                setError('No se pudo guardar el recuerdo. Intenta de nuevo.');
            }
        } catch (err) {
            if (!isMounted.current) return;
            setError(err.message || 'Error al guardar el recuerdo.');
        } finally {
            if (isMounted.current) setIsSubmitting(false);
        }
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.splitLayout}>
                {/* ── Columna Principal: El Corazón del Recuerdo ── */}
                <div className={styles.mainColumn}>
                    <motion.div 
                        className={styles.formSection}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <KawaiiInput
                            label="¿Qué pasó hoy? ✨"
                            name="title"
                            required
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="Título del momento..."
                            iconLeft="edit"
                        />
                    </motion.div>

                    <motion.div 
                        className={styles.formSection}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <KawaiiInput
                            type="textarea"
                            label="Cuéntame más... 📝"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Escribe aquí los detalles de este momento especial..."
                            rows={6}
                        />
                    </motion.div>

                    <motion.div 
                        className={styles.formSection}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <label className={styles.label}>📸 Fotos ({files.length}/50)</label>
                        <div className={styles.mediaContainerCompact}>
                            <MediaUploader files={files} onChange={setFiles} />
                        </div>
                    </motion.div>
                </div>

                {/* ── Columna Lateral: Detalles y Vibes ── */}
                <div className={styles.sideColumn}>
                    <motion.div 
                        className={styles.formSection}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        <KawaiiInput
                            type="date"
                            label="Fecha"
                            name="eventDate"
                            required
                            value={formData.eventDate}
                            onChange={handleChange}
                            iconLeft="calendar_today"
                        />
                    </motion.div>

                    <motion.div 
                        className={styles.formSection}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 }}
                    >
                        <label className={styles.label}>📍 ¿Dónde fue?</label>
                        <div 
                            className={`${styles.locationSelector} ${locationError ? styles.locationError : ''}`}
                            onClick={() => {
                                setLocationError(false);
                                setIsPlacePickerOpen(true);
                            }}
                        >
                            <div className={styles.locationIcon}>
                                <span className="material-symbols-rounded">location_on</span>
                            </div>
                            <div className={styles.locationInfo}>
                                <strong>{formData.placeName || 'Selecciona un lugar...'}</strong>
                                {formData.placeLat ? (
                                    <span className={styles.coords}>
                                        {formData.placeLat.toFixed(4)}, {formData.placeLng.toFixed(4)}
                                    </span>
                                ) : (
                                    <span className={styles.coords}>Toca para elegir ubicación</span>
                                )}
                            </div>
                            <span className={`material-symbols-rounded ${styles.chevronIcon}`}>chevron_right</span>
                        </div>
                        {locationError && <p className={styles.errorText}>Por favor selecciona una ubicación para el mapa.</p>}
                    </motion.div>

                    <motion.div 
                        className={styles.formSection}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <KawaiiSwitch 
                            checked={formData.isSpecial} 
                            onChange={(val) => setFormData(prev => ({ ...prev, isSpecial: val }))} 
                            label="Evento Especial ⭐" 
                            icon="👑"
                        />
                    </motion.div>

                    <motion.div 
                        className={`${styles.formSection} ${styles.tagsContainer}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                    >
                        <label className={styles.label}>🏷️ Etiquetas (Vibes)</label>
                        <div className={styles.tagsGridCompact}>
                            {allAvailableTags.length > 0 ? (
                                allAvailableTags.map(tag => (
                                    <motion.button
                                        key={tag.id}
                                        type="button"
                                        whileTap={{ scale: 0.9 }}
                                        className={`${styles.tagBtnSmall} ${formData.tags?.includes(tag.id) ? styles.tagBtnActiveSmall : ''}`}
                                        onClick={() => toggleTag(tag.id)}
                                    >
                                        {tag.emoji} {tag.label}
                                    </motion.button>
                                ))
                            ) : (
                                <p className={styles.noTags}>Sin etiquetas ✨</p>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            <motion.div 
                className={styles.actionsSticky}
                initial={{ y: 50 }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
                <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting} className={styles.submitBtn}>
                    {isSubmitting ? 'Guardando...' : 'Guardar Recuerdo ✨'}
                </Button>
            </motion.div>

            <PlacePickerBottomSheet
                isOpen={isPlacePickerOpen}
                onClose={() => setIsPlacePickerOpen(false)}
                places={defaultPlaces}
                onSelectPlace={(placeId, placeName) => {
                    setFormData(prev => ({ 
                        ...prev, 
                        placeId, 
                        placeName: placeName || prev.placeName,
                        placeLat: null, 
                        placeLng: null 
                    }));
                }}
                onLocationSelected={(locationData, placeId, placeName) => {
                    setFormData(prev => ({
                        ...prev,
                        placeId: placeId || 'custom',
                        placeName: placeName || 'Ubicación seleccionada',
                        placeLat: locationData.lat,
                        placeLng: locationData.lng
                    }));
                }}
            />
        </form>
    );
}
