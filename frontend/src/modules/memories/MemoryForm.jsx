import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { createMemory, findOrCreatePlace, updateMemory } from '../../apiClient';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { usePendingCitas } from '../../hooks/usePendingCitas';
import PhotoUploader from './PhotoUploader';
import PlacePickerBottomSheet from '../../components/PendingDates/PlacePickerBottomSheet';
import Memory from '../../models/Memory';
import { reverseGeocode } from '../../services/mapService';
import { MEMORY_TAGS_OPTIONS, PLACE_CATEGORIES } from '../../config/constants';
import { extractMetadataFromFile } from '../../utils/extractGpsFromFile';
import { usePlaces } from '../map/hooks/usePlaces';
import exifr from 'exifr';

import Input from '../../components/ui/Input/Input';
import Button from '../../components/ui/Button/Button';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import styles from './MemoryForm.module.css';

// Helper to format date for input type="datetime-local"
const toInputDateTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const z = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = z(d.getMonth() + 1);
    const dd = z(d.getDate());
    const hh = z(d.getHours());
    const min = z(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

export default function MemoryForm({ initialData = null, onSuccess, onCancel, role = 'admin', bingoContext = null, initialPhotos = [] }) {
    const isPartner = role === 'partner';
    const { user } = useAuth();
    const { queueMemory } = useOfflineQueue();
    const { getActiveDraft, saveDraft, removePendingCita } = usePendingCitas();
    const isEditing = !!initialData;

    const [form, setForm] = useState({
        title: initialData?.title ?? '',
        description: initialData?.description ?? '',
        eventDate: initialData?.eventDate
            ? toInputDateTime(
                typeof initialData.eventDate.toDate === 'function'
                    ? initialData.eventDate.toDate()
                    : new Date(initialData.eventDate)
            )
            : toInputDateTime(new Date()),
        tags: initialData?.tags ?? [],
        // Place fields
        placeName: bingoContext?.placeName ?? initialData?.placeName ?? '',
        placeCity: '',
        placeLat: '',
        placeLng: '',
        placeCategory: bingoContext?.placeCategory ?? PLACE_CATEGORIES.OTRO,
    });

    const [memoryId, setMemoryId] = useState(initialData?.id ?? null);
    const [draftPhotos, setDraftPhotos] = useState(initialPhotos || []);
    const [isResuming, setIsResuming] = useState(false);
    const [foundDraft, setFoundDraft] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [isPlacePickerOpen, setIsPlacePickerOpen] = useState(false);
    const [selectedPlaceId, setSelectedPlaceId] = useState(initialData?.placeId ?? '');
    const [customLocation, setCustomLocation] = useState(null);
    const [error, setError] = useState(null);
    const [step, setStep] = useState(isPartner ? 'details' : 'unified'); // 'details' | 'photos' | 'unified'
    const { places } = usePlaces();

    // 1. Check for drafts on mount (only for new memories, not edits)
    useEffect(() => {
        if (!isEditing && isPartner) {
            getActiveDraft().then(draft => {
                if (draft) setFoundDraft(draft);
            });
        }
    }, [isEditing, isPartner, getActiveDraft]);

    // 2. Auto-save draft when form or photos change
    useEffect(() => {
        if (!isEditing && isPartner && !foundDraft && (form.title || draftPhotos.length > 0 || form.description)) {
            const timer = setTimeout(() => {
                saveDraft(memoryId, form, draftPhotos).then(id => {
                    if (!memoryId) setMemoryId(id);
                });
            }, 500); // Faster saving for better robustness
            return () => clearTimeout(timer);
        }
    }, [form, draftPhotos, memoryId, isEditing, isPartner, foundDraft, saveDraft]);

    function handleResume() {
        if (!foundDraft) return;
        setForm(foundDraft.data || form);
        setMemoryId(foundDraft.id);
        // Map stored photo blobs back to fake files for the uploader
        const photos = (foundDraft.photos || []).map(p => {
            const file = new File([p.file], p.name, { type: p.type });
            return file;
        });
        setDraftPhotos(photos);
        
        // Recover place selection if it was a known place
        if (foundDraft.data?.placeId) {
            setSelectedPlaceId(foundDraft.data.placeId);
        } else if (foundDraft.data?.customLocation) {
            setCustomLocation(foundDraft.data.customLocation);
            setSelectedPlaceId('custom_map');
        }

        setFoundDraft(null);
    }

    async function handleDiscardDraft() {
        if (foundDraft) {
            await removePendingCita(foundDraft.id);
            setFoundDraft(null);
        }
    }

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

        // Lazy Metadata Extraction before saving (Final check)
        if (draftPhotos?.length > 0) {
            try {
                const metadata = await extractMetadataFromFile(draftPhotos[0]);
                if (metadata) {
                    setForm(f => {
                        const updates = {};
                        if (metadata.lat && !f.placeLat) {
                            updates.placeLat = String(metadata.lat);
                            updates.placeLng = String(metadata.lng);
                        }
                        if (metadata.dateTime && !f.eventDate) {
                            updates.eventDate = toInputDateTime(metadata.dateTime);
                        }
                        if (Object.keys(updates).length === 0) return f;
                        return { ...f, ...updates };
                    });
                }
            } catch (err) {
                console.warn('[Metadata Extraction] Final check failed:', err);
            }
        }

        try {
            let finalPlaceId = initialData?.placeId ?? null;
            let finalPlaceName = form.placeName || null;

            if (selectedPlaceId && selectedPlaceId !== 'custom_map') {
                finalPlaceId = selectedPlaceId;
            } else if (customLocation || (form.placeLat && form.placeLng)) {
                // If it's a new place or manual coords
                const result = await findOrCreatePlace({
                    lat: customLocation?.lat || form.placeLat,
                    lng: customLocation?.lng || form.placeLng,
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

            if (draftPhotos?.length > 0 && !isEditing) {
                // Si ya tenemos fotos (flujo Partner/Pending), usamos la cola offline
                // que garantiza subida robusta y creación del registro.
                await queueMemory(memoryPayload, draftPhotos);
                
                // IMPORTANTE: Limpiar el borrador local al finalizar con éxito
                if (memoryId) await removePendingCita(memoryId);
                
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
            {/* Draft Recovery Prompt */}
            <ConfirmModal 
                isOpen={!!foundDraft}
                emoji="✨"
                title="¡Cita a medias!"
                message="Encontramos una cita que no terminaste. ¿Quieres continuar donde te quedaste?"
                confirmText="Continuar ✨"
                cancelText="Empezar de cero"
                onConfirm={handleResume}
                onCancel={handleDiscardDraft}
            />

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
                            label="Fecha y Hora"
                            type="datetime-local"
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
                        📍 {selectedPlaceId ? 'Ubicación seleccionada' : 'Selecciona un lugar'}
                        {isGeocoding && <span className={styles.miniLoader}> (Buscando nombre...)</span>}
                    </div>

                    <div 
                        className={`${styles.locationInput} ${!selectedPlaceId ? styles.locationPlaceholder : ''}`}
                        onClick={() => setIsPlacePickerOpen(true)}
                    >
                        <span className="material-symbols-outlined">location_on</span>
                        <div className={styles.locationText}>
                            <strong>{form.placeName || 'Toca para elegir el lugar...'}</strong>
                            <span>{form.placeCity || (form.placeLat ? `${form.placeLat}, ${form.placeLng}` : 'Busca en la lista o el mapa')}</span>
                        </div>
                        <span className="material-symbols-outlined">chevron_right</span>
                    </div>

                    <PlacePickerBottomSheet
                        isOpen={isPlacePickerOpen}
                        onClose={() => setIsPlacePickerOpen(false)}
                        places={places || []}
                        onSelectPlace={(placeId) => {
                            setSelectedPlaceId(placeId);
                            setCustomLocation(null);
                            const p = places.find(x => x.id === placeId);
                            if (p) {
                                setForm(f => ({ 
                                    ...f, 
                                    placeName: p.name,
                                    placeCity: p.city || f.placeCity,
                                    placeCategory: p.category || f.placeCategory
                                }));
                            }
                        }}
                        onLocationSelected={(loc, placeId, name) => {
                            if (placeId) {
                                setSelectedPlaceId(placeId);
                                setCustomLocation(null);
                                setForm(f => ({ ...f, placeName: name || f.placeName }));
                            } else {
                                setCustomLocation(loc);
                                setSelectedPlaceId('custom_map');
                                setForm(f => ({ 
                                    ...f, 
                                    placeName: name || f.placeName,
                                    placeLat: String(loc.lat),
                                    placeLng: String(loc.lng)
                                }));
                            }
                        }}
                    />

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
                        initialFiles={draftPhotos}
                        onPhotosChange={(newFiles) => {
                            const updatedPhotos = [...draftPhotos, ...newFiles];
                            setDraftPhotos(updatedPhotos);
                            // Immediate persistence for robustness
                            if (isPartner && !isEditing) {
                                saveDraft(memoryId, form, updatedPhotos).then(id => {
                                    if (!memoryId) setMemoryId(id);
                                });
                            }
                        }}
                        onDone={() => {
                            if (step === 'unified') {
                                // For admin unified...
                            }
                            // Final save/queue happens in handleSaveDetails or via final button
                            if (isPartner && step === 'photos') {
                                handleSaveDetails();
                            } else {
                                onSuccess();
                            }
                        }}
                        onMetadataDetected={(metadata) => {
                            if (!metadata) return;

                            setForm(f => {
                                const updates = {};
                                
                                // 1. Update GPS if we don't have it yet
                                if (metadata.lat && !f.placeLat) {
                                    updates.placeLat = String(metadata.lat);
                                    updates.placeLng = String(metadata.lng);
                                }

                                // 2. Update Date if photo has it
                                if (metadata.dateTime) {
                                    updates.eventDate = toInputDateTime(metadata.dateTime);
                                }

                                if (Object.keys(updates).length === 0) return f;
                                return { ...f, ...updates };
                            });
                        }}
                    />
                    {step === 'unified' && (
                        <div className={styles.unifiedActions}>
                            <Button onClick={handleSaveDetails}>Finalizar y Guardar Recuerdo ✨</Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
