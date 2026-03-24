import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { createMemory, findOrCreatePlace, updateMemory, completeBingoSquare } from '../../apiClient';
import BingoSuggestionSheet from './components/BingoSuggestionSheet';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { usePendingCitas } from '../../hooks/usePendingCitas';
import Memory from '../../models/Memory';
import { reverseGeocode } from '../../services/mapService';
import { PLACE_CATEGORIES } from '../../config/constants';
import { extractMetadataFromFile } from '../../utils/extractGpsFromFile';
import { usePlaces } from '../map/hooks/usePlaces';
import { useBingo } from '../../hooks/useBingo';

import styles from './MemoryForm.module.css';

// Sub-components
import StepIndicator from './components/StepIndicator';
import DraftRecoveryPrompt from './components/DraftRecoveryPrompt';
import MemoryDetailsForm from './components/MemoryDetailsForm';
import MemoryPhotoSection from './components/MemoryPhotoSection';

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
        placeName: bingoContext?.placeName ?? initialData?.placeName ?? '',
        placeCity: '',
        placeLat: '',
        placeLng: '',
        placeCategory: bingoContext?.placeCategory ?? PLACE_CATEGORIES.OTRO,
    });

    const [memoryId, setMemoryId] = useState(initialData?.id ?? null);
    const [draftPhotos, setDraftPhotos] = useState(initialPhotos || []);
    const [foundDraft, setFoundDraft] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [isPlacePickerOpen, setIsPlacePickerOpen] = useState(false);
    const [selectedPlaceId, setSelectedPlaceId] = useState(initialData?.placeId ?? '');
    const [customLocation, setCustomLocation] = useState(null);
    const [error, setError] = useState(null);
    const [step, setStep] = useState(isPartner ? 'details' : 'unified'); 
    
    // Bingo Suggestions States
    const [bingoSuggestions, setBingoSuggestions] = useState([]);
    const [showBingoSheet, setShowBingoSheet] = useState(false);
    const { places } = usePlaces();
    const { availableTags } = useBingo();

    // drafts on mount
    useEffect(() => {
        if (!isEditing && isPartner) {
            getActiveDraft().then(draft => {
                if (draft) setFoundDraft(draft);
            });
        }
    }, [isEditing, isPartner, getActiveDraft]);

    // autosave draft
    useEffect(() => {
        if (!isEditing && isPartner && !foundDraft && (form.title || draftPhotos.length > 0 || form.description)) {
            const timer = setTimeout(() => {
                saveDraft(memoryId, form, draftPhotos).then(id => {
                    if (!memoryId) setMemoryId(id);
                });
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [form, draftPhotos, memoryId, isEditing, isPartner, foundDraft, saveDraft]);

    function handleResume() {
        if (!foundDraft) return;
        setForm(foundDraft.data || form);
        setMemoryId(foundDraft.id);
        const photos = (foundDraft.photos || []).map(p => {
            const file = new File([p.file], p.name, { type: p.type });
            return file;
        });
        setDraftPhotos(photos);
        
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
                if (result && !form.placeName) {
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
                await queueMemory(memoryPayload, draftPhotos);
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

                // Handle Bingo Suggestions
                if (response.bingoSuggestions?.length > 0) {
                    setBingoSuggestions(response.bingoSuggestions);
                    setShowBingoSheet(true);
                    return; // Don't call onSuccess yet, wait for Modal
                }
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

    async function handleBingoConfirm(selectedCategoryIds) {
        setIsSaving(true);
        try {
            await Promise.all(
                selectedCategoryIds.map(categoryId => 
                    completeBingoSquare({ 
                        categoryId, 
                        memoryId: memoryId 
                    })
                )
            );
        } catch (err) {
            console.error('[Bingo Link Error]', err);
        } finally {
            setIsSaving(false);
            setShowBingoSheet(false);
            onSuccess?.();
        }
    }



    return (
        <div className={styles.root}>
            <DraftRecoveryPrompt 
                foundDraft={foundDraft}
                onResume={handleResume}
                onDiscard={handleDiscardDraft}
            />

            <StepIndicator step={step} isPartner={isPartner} />

            {(step === 'details' || step === 'unified') && (
                <MemoryDetailsForm 
                    form={form}
                    setForm={setForm}
                    toggleTag={toggleTag}
                    isSaving={isSaving}
                    onCancel={onCancel}
                    isEditing={isEditing}
                    isPartner={isPartner}
                    onSave={handleSaveDetails}
                    availableTags={availableTags}
                    isGeocoding={isGeocoding}
                    selectedPlaceId={selectedPlaceId}
                    setIsPlacePickerOpen={setIsPlacePickerOpen}
                    isPlacePickerOpen={isPlacePickerOpen}
                    places={places}
                    error={error}
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
            )}

            {(step === 'photos' || (step === 'unified' && !isEditing)) && (
                <MemoryPhotoSection 
                    isPartner={isPartner}
                    isEditing={isEditing}
                    memoryId={memoryId}
                    draftPhotos={draftPhotos}
                    step={step}
                    onPhotosChange={(newFiles) => {
                        const updatedPhotos = [...draftPhotos, ...newFiles];
                        setDraftPhotos(updatedPhotos);
                        if (isPartner && !isEditing) {
                            saveDraft(memoryId, form, updatedPhotos).then(id => {
                                if (!memoryId) setMemoryId(id);
                            });
                        }
                    }}
                    onDone={() => {
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
                            if (metadata.lat && !f.placeLat) {
                                updates.placeLat = String(metadata.lat);
                                updates.placeLng = String(metadata.lng);
                            }
                            if (metadata.dateTime) {
                                updates.eventDate = toInputDateTime(metadata.dateTime);
                            }
                            if (Object.keys(updates).length === 0) return f;
                            return { ...f, ...updates };
                        });
                    }}
                    onFinalSave={handleSaveDetails}
                />
            )}

            <BingoSuggestionSheet 
                isOpen={showBingoSheet}
                suggestions={bingoSuggestions}
                onConfirm={handleBingoConfirm}
                onCancel={async () => {
                    // Save to IndexedDB so badge appears on board even if sheet is dismissed
                    try {
                        const { openDB } = await import('../../config/dbConfig');
                        const db = await openDB();
                        const tx = db.transaction('pending_bingo', 'readwrite');
                        const store = tx.objectStore('pending_bingo');
                        
                        // Use existing memoryId or generate UUID
                        const mid = memoryId || crypto.randomUUID();
                        
                        store.put({
                            memoryId: mid,
                            suggestions: bingoSuggestions,
                            createdAt: Date.now(),
                            resolved: false,
                            dismissed: true
                        });
                        
                        await new Promise((resolve, reject) => {
                            tx.oncomplete = () => resolve();
                            tx.onerror = () => reject(tx.error);
                        });
                        window.dispatchEvent(new Event('pending_bingo_updated'));
                    } catch (err) {
                        console.error('[MemoryForm] Error saving suggestions to IndexedDB:', err);
                    }

                    setShowBingoSheet(false);
                    onSuccess?.();
                }}
                isSaving={isSaving}
            />
        </div>
    );
}


