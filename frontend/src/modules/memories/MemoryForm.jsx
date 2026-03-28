import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { useAppConfig } from '../../context/AppConfigContext';
import Button from '../../components/ui/Button/Button';
import KawaiiInput from '../../components/ui/KawaiiInput/KawaiiInput';
import MediaUploader from '../capsules/components/MediaUploader';
import PlacePickerBottomSheet from '../../components/PendingDates/PlacePickerBottomSheet';
import styles from './MemoryForm.module.css';
import { toast } from '../../components/ui/PastelToast/PastelToast';

/**
 * MemoryForm - Full version with Place Picker, Tags, and Special toggle.
 */
export default function MemoryForm({ onSuccess, onCancel, initialData = null, bingoOrigin = null, defaultPlaces = [] }) {
    const { relationshipId } = useAuth();
    const { queueMemory } = useOfflineQueue();
    const { memoryTags } = useAppConfig();
    
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

    const [formData, setFormData] = useState(initialData || {
        title: '',
        description: '',
        eventDate: new Date().toISOString().split('T')[0],
        tags: [],
        placeName: '',
        placeId: '',
        placeLat: null,
        placeLng: null,
        isSpecial: false,
    });

    const [files, setFiles] = useState(initialData?.photos || []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    const toggleTag = (tag) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.includes(tag)
                ? prev.tags.filter(t => t !== tag)
                : [...prev.tags, tag]
        }));
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

            <div className={styles.scrollArea}>
                <div className={styles.leftColumn}>
                    <div className={styles.formSection}>
                        <KawaiiInput
                            label="¿Qué pasó hoy? ✨"
                            name="title"
                            required
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="Título del recuerdo..."
                            iconLeft="edit"
                        />
                    </div>

                    <div className={styles.formSection}>
                        <KawaiiInput
                            type="date"
                            label="Fecha del momento"
                            name="eventDate"
                            required
                            value={formData.eventDate}
                            onChange={handleChange}
                            iconLeft="calendar_today"
                        />
                    </div>

                    <div className={styles.formSection}>
                        <KawaiiInput
                            type="textarea"
                            label="Cuéntame más... 📝"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Escribe aquí los detalles..."
                            rows={3}
                        />
                    </div>

                    <div className={styles.formSection}>
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
                                    <span className={styles.coords}>Toca para elegir</span>
                                )}
                            </div>
                            <span className="material-symbols-rounded">chevron_right</span>
                        </div>
                        {locationError && <p className={styles.errorText}>Por favor selecciona una ubicación.</p>}
                    </div>
                </div>

                <div className={styles.rightColumn}>
                    <div className={styles.formSection}>
                        <label className={styles.label}>🏷️ Etiquetas</label>
                        <div className={styles.tagsGrid}>
                            {(memoryTags || []).map(tag => (
                                <button
                                    key={tag.value}
                                    type="button"
                                    className={`${styles.tagBtn} ${formData.tags.includes(tag.value) ? styles.tagBtnActive : ''}`}
                                    onClick={() => toggleTag(tag.value)}
                                >
                                    {tag.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.formSection}>
                        <div className={styles.specialToggleRow}>
                            <div className={styles.specialInfo}>
                                <span className={styles.specialIcon}>⭐</span>
                                <div>
                                    <strong>Momento Especial</strong>
                                    <p>Destacar en su historia</p>
                                </div>
                            </div>
                            <label className={styles.switch}>
                                <input
                                    type="checkbox"
                                    name="isSpecial"
                                    checked={formData.isSpecial}
                                    onChange={handleChange}
                                />
                                <span className={styles.slider}></span>
                            </label>
                        </div>
                    </div>

                    <div className={styles.formSection}>
                        <label className={styles.label}>📸 Fotos ({files.length})</label>
                        <MediaUploader files={files} setFiles={setFiles} maxFiles={50} />
                    </div>
                </div>
            </div>

            <div className={styles.actions}>
                <Button variant="ghost" type="button" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando...' : 'Guardar Recuerdo'}
                </Button>
            </div>

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
