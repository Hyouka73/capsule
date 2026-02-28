import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
// En lugar de llamar servicios de DB, delegamos al Backend (Serverless BFF)
import { createMemory, findOrCreatePlace, updateMemory } from '../../apiClient';
import PhotoUploader from './PhotoUploader';
import { MEMORY_TAGS_OPTIONS, PLACE_CATEGORIES } from '../../config/constants';

import Input from '../../components/ui/Input/Input';
import Button from '../../components/ui/Button/Button';
import styles from './MemoryForm.module.css';

export default function MemoryForm({ initialData = null, onSuccess, onCancel, role = 'admin', bingoContext = null }) {
    const isPartner = role === 'partner';
    const { user } = useAuth();
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
        adminNotes: isPartner ? '' : (initialData?.adminNotes ?? ''),
        // Place fields
        placeName: bingoContext?.placeName ?? initialData?.placeName ?? '',
        placeCity: '',
        placeLat: '',
        placeLng: '',
        placeCategory: bingoContext?.placeCategory ?? PLACE_CATEGORIES.OTRO,
    });

    const [memoryId, setMemoryId] = useState(initialData?.id ?? null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [step, setStep] = useState('details'); // 'details' | 'photos'

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
        e.preventDefault();
        setError(null);
        setIsSaving(true);

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

            // Payload limpio. Todo el mapeo y metadatos (photoCount, createdAt, uid auth) lo hace el backend.
            const memoryPayload = {
                title: form.title,
                description: form.description,
                eventDate: form.eventDate, // String YYYY-MM-DD
                tags: form.tags,
                ...(isPartner ? {} : { adminNotes: form.adminNotes }),
                placeId: finalPlaceId,
                placeName: finalPlaceName,
                ...(bingoContext ? { bingoContext } : {}),
            };

            if (isEditing) {
                await updateMemory({ memoryId: initialData.id, ...memoryPayload });
                setMemoryId(initialData.id);
            } else {
                const response = await createMemory(memoryPayload);
                setMemoryId(response.memoryId);
            }

            if (!isEditing) {
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
            {/* Step indicator */}
            <div className={styles.steps}>
                <div className={`${styles.step} ${step === 'details' ? styles.stepActive : styles.stepDone}`}>
                    1. Detalles
                </div>
                <div className={styles.stepDivider} />
                <div className={`${styles.step} ${step === 'photos' ? styles.stepActive : ''}`}>
                    2. Fotos
                </div>
            </div>

            {step === 'details' && (
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

                    <div className={styles.sectionLabel}>📍 Lugar (opcional)</div>
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

                    {!isPartner && (
                        <div className={styles.field}>
                            <label className={styles.label}>Notas privadas</label>
                            <textarea
                                className={styles.textarea}
                                placeholder="Contexto interno..."
                                value={form.adminNotes}
                                onChange={e => setForm(f => ({ ...f, adminNotes: e.target.value }))}
                                rows={2}
                            />
                        </div>
                    )}

                    {error && <p className={styles.error}>{error}</p>}

                    <div className={styles.actions}>
                        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
                        <Button type="submit" isLoading={isSaving}>
                            {isEditing ? 'Guardar cambios' : 'Siguiente →'}
                        </Button>
                    </div>
                </form>
            )}

            {step === 'photos' && memoryId && (
                <PhotoUploader
                    memoryId={memoryId}
                    onDone={onSuccess}
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
            )}
        </div>
    );
}
