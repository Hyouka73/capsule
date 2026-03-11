import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
// En lugar de llamar servicios de DB, delegamos al Backend (Serverless BFF)
import { createMemory, findOrCreatePlace, updateMemory } from '../../apiClient';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import PhotoUploader from './PhotoUploader';
import Memory from '../../models/Memory';
import { reverseGeocode } from '../../services/mapService';
import { MEMORY_TAGS_OPTIONS, PLACE_CATEGORIES } from '../../config/constants';
import exifr from 'exifr';

import Input from '../../components/ui/Input/Input';
import Button from '../../components/ui/Button/Button';
import styles from './MemoryForm.module.css';

export default function MemoryForm({ initialData = null, onSuccess, onCancel, role = 'admin', bingoContext = null, initialPhotos = [] }) {
    const isPartner = role === 'partner';
    const { user } = useAuth();
    const { queueMemory } = useOfflineQueue();
    const isEditing = !!initialData;

    const [form, setForm] = useState({
        title: initialData?.title ?? '',
        description: initialData?.description ?? '',
        eventDate: initialData?.eventDate
            ? toInputDate(
                typeof initialData.eventDate.toDate === 'function'
                    ? initialData.eventDate.toDate()
                    : new Date(initialData.eventDate)
            )
            : toInputDate(new Date()),
        tags: initialData?.tags ?? [],
        // Place fields
        placeName: bingoContext?.placeName ?? initialData?.placeName ?? '',
        placeCity: '',
        placeLat: '',
        placeLng: '',
        placeCategory: bingoContext?.placeCategory ?? PLACE_CATEGORIES.OTRO,
    });

    const [memoryId, setMemoryId] = useState(initialData?.id ?? null);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [error, setError] = useState(null);
    const [step, setStep] = useState(isPartner ? 'details' : 'unified'); // 'details' | 'photos' | 'unified'

    // Auto-Geocode when coords change and name is empty
    useEffect(() => {
        if (form.placeLat && form.placeLng && !form.placeName && !isGeocoding) {
            const timer = setTimeout(async () => {
                setIsGeocoding(true);
                const result = await reverseGeocode(form.placeLat, form.placeLng);
                if (result && !form.placeName) { // Double check name is still empty
                    setForm(f => ({
                        ...f,
                        placeName: result.name,
                        placeCity: result.city || f.placeCity
                    }));
                }
                setIsGeocoding(false);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [form.placeLat, form.placeLng, form.placeName, isGeocoding]);

    function toInputDate(date) {
        return date.toISOString().split('T')[0];
    }

    function toggleTag(tag) {
        setForm(f => ({
            ...f,
            tags: f.tags.includes(tag)
                ? f.tags.filter(t => t !== tag)
                : [...f.tags, tag],
        }));
    }

    async function handleSaveDetails(e) {
        if (e) e.preventDefault();
        setError(null);
        setIsSaving(true);

        // Lazy GPS Extraction before saving
        let coords = null;
        if (!form.placeLat && initialPhotos?.length > 0) {
            try {
                // Try extracting from the first file in initialPhotos
                const rawCoords = await exifr.gps(initialPhotos[0]);
                if (rawCoords) {
                    coords = { lat: rawCoords.latitude, lng: rawCoords.longitude };
                }
            } catch (err) {
                console.warn('[GPS Extraction] Failed to read EXIF:', err);
            }
        }

        try {
            let finalPlaceId = initialData?.placeId ?? null;
            let finalPlaceName = form.placeName || null;

            if (form.placeLat && form.placeLng && form.placeName) {
                // Llamada transparente al backend
                const result = await findOrCreatePlace({
                    lat: form.placeLat,
                    lng: form.placeLng,
                    name: form.placeName,
                    city: form.placeCity,
                    category: form.placeCategory,
                    tags: form.tags,
                });
                finalPlaceId = result.placeId;
            }

            // Use model for data sanitization and standardization
            const memoryModel = Memory.fromForm({
                ...form,
                id: memoryId || initialData?.id,
                placeId: finalPlaceId,
                placeName: finalPlaceName,
            });

            const memoryPayload = {
                ...memoryModel.toApiPayload(),
                ...(bingoContext ? { bingoContext } : {}),
            };

            if (initialPhotos?.length > 0 && !isEditing) {
                // Si ya tenemos fotos (flujo Partner/Pending), usamos la cola offline
                // que garantiza subida robusta y creación del registro.
                await queueMemory(memoryPayload, initialPhotos);
                onSuccess?.();
                return;
            }

            if (isEditing) {
                await updateMemory({ memoryId: initialData.id, ...memoryPayload });
                setMemoryId(initialData.id);
            } else {
                const response = await createMemory(memoryPayload);
                setMemoryId(response.memoryId);
            }

            if (!isEditing && isPartner) {
                setStep('photos');
            } else {
                onSuccess?.();
            }
        } catch (err) {
            setError('Error al guardar. Intenta de nuevo.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className={styles.root}>
            {/* Step indicator (Partner only) */}
            {isPartner && (
                <div className={styles.steps}>
                    <div className={`${styles.step} ${step === 'details' ? styles.stepActive : styles.stepDone}`}>
                        1. Detalles
                    </div>
                    <div className={styles.stepDivider} />
                    <div className={`${styles.step} ${step === 'photos' ? styles.stepActive : ''}`}>
                        2. Fotos
                    </div>
                </div>
            )}

            {(step === 'details' || step === 'unified') && (
                <form onSubmit={handleSaveDetails} className={styles.form}>
                    <div className={styles.row}>
                        <Input
                            label="Título"
                            placeholder="Ej. Noche de películas 🎬"
                            value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        />

                        <Input
                            label="Fecha"
                            type="date"
                            value={form.eventDate}
                            onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))}
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Descripción</label>
                        <textarea
                            className={styles.textarea}
                            placeholder="¿Qué hicieron? ¿Cómo se sintió?"
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            rows={3}
                        />
                    </div>

                    <div className={styles.sectionLabel}>
                        📍 Lugar (opcional)
                        {isGeocoding && <span className={styles.miniLoader}> (Buscando nombre...)</span>}
                    </div>
                    <div className={styles.row}>
                        <Input
                            label="Nombre"
                            placeholder="Ej. Cinemex"
                            value={form.placeName}
                            onChange={e => setForm(f => ({ ...f, placeName: e.target.value }))}
                        />
                        <Input
                            label="Ciudad"
                            placeholder="Tuxtla"
                            value={form.placeCity}
                            onChange={e => setForm(f => ({ ...f, placeCity: e.target.value }))}
                        />
                    </div>

                    <div className={styles.row}>
                        <Input
                            label="Latitud"
                            type="number" step="any"
                            value={form.placeLat}
                            onChange={e => setForm(f => ({ ...f, placeLat: e.target.value }))}
                        />
                        <Input
                            label="Longitud"
                            type="number" step="any"
                            value={form.placeLng}
                            onChange={e => setForm(f => ({ ...f, placeLng: e.target.value }))}
                        />
                        <div className={styles.field}>
                            <label className={styles.label}>Categoría</label>
                            <select
                                className={styles.select}
                                value={form.placeCategory}
                                onChange={e => setForm(f => ({ ...f, placeCategory: e.target.value }))}
                            >
                                {Object.entries(PLACE_CATEGORIES).map(([key, val]) => (
                                    <option key={key} value={val}>{val}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className={styles.sectionLabel}>🏷️ Tags</div>
                    <div className={styles.tags}>
                        {MEMORY_TAGS_OPTIONS.map(({ value, label }) => (
                            <button
                                key={value}
                                type="button"
                                className={`${styles.tagBtn} ${form.tags.includes(value) ? styles.tagActive : ''}`}
                                onClick={() => toggleTag(value)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>


                    {error && <p className={styles.error}>{error}</p>}

                    <div className={styles.actions}>
                        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
                        <Button type="submit" isLoading={isSaving}>
                            {isEditing ? 'Guardar cambios' : (isPartner ? 'Siguiente →' : 'Guardar Info y Generar ID')}
                        </Button>
                    </div>
                </form>
            )}

            {(step === 'photos' || (step === 'unified' && !isEditing)) && (
                <div className={styles.photoSection}>
                    {!isPartner && <div className={styles.sectionLabel}>📸 Fotos del momento</div>}
                    <PhotoUploader
                        memoryId={memoryId}
                        initialFiles={initialPhotos}
                        onDone={() => {
                            if (step === 'unified') {
                                // For admin unified, we might wait for manual "Finish" or auto-close
                            }
                            onSuccess();
                        }}
                        onGpsDetected={(coords) => {
                            if (coords && !form.placeLat) {
                                setForm(f => ({
                                    ...f,
                                    placeLat: String(coords.lat),
                                    placeLng: String(coords.lng),
                                }));
                            }
                        }}
                    />
                    {step === 'unified' && (
                        <div className={styles.unifiedActions}>
                            <Button onClick={onSuccess}>Finalizar y Guardar Recuerdo ✨</Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
