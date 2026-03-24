import React from 'react';
import Input from '../../../components/ui/Input/Input';
import Button from '../../../components/ui/Button/Button';
import PlacePickerBottomSheet from '../../../components/PendingDates/PlacePickerBottomSheet';
import { useAppConfig } from '../../../context/AppConfigContext';
import styles from '../MemoryForm.module.css';

export default function MemoryDetailsForm({
    form,
    setForm,
    toggleTag,
    isSaving,
    onCancel,
    isEditing,
    isPartner,
    onSave,
    isGeocoding,
    selectedPlaceId,
    setIsPlacePickerOpen,
    isPlacePickerOpen,
    places,
    onSelectPlace,
    onLocationSelected,
    availableTags,
    error
}) {
    const { memoryTags } = useAppConfig();
    return (
        <form onSubmit={onSave} className={styles.form}>
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
                onSelectPlace={onSelectPlace}
                onLocationSelected={onLocationSelected}
            />

            <div className={styles.sectionLabel}>🏷️ Tags</div>
            <div className={styles.tags}>
                {(() => {
                    // Combine global config tags with dynamic Bingo tags
                    const allTags = [...(memoryTags || [])];
                    (availableTags || []).forEach(tag => {
                        if (!allTags.find(t => t.value === tag.value)) {
                            allTags.push(tag);
                        }
                    });

                    return allTags.map(({ value, label }) => (
                        <button
                            key={value}
                            type="button"
                            className={`${styles.tagBtn} ${form.tags.includes(value) ? styles.tagActive : ''}`}
                            onClick={() => toggleTag(value)}
                        >
                            {label}
                        </button>
                    ));
                })()}
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.actions}>
                <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
                <Button type="submit" isLoading={isSaving}>
                    {isEditing ? 'Guardar cambios' : (isPartner ? 'Siguiente →' : 'Guardar Info y Generar ID')}
                </Button>
            </div>
        </form>
    );
}
