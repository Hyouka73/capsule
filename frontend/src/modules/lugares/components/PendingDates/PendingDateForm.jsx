import React, { useState } from 'react';
import styles from './PendingDateForm.module.css';

const MOCK_ALL_TAGS = ['cine', 'comida', 'romántico', 'aventura', 'relajación', 'fiesta', 'misterioso'];

export default function PendingDateForm({ pendingDate, onClose, onSave, defaultPlaces }) {
    // Determine the default place if one exists.
    // If pendingDate has a suggested place logic, we would set it here.
    const [selectedPlaceId, setSelectedPlaceId] = useState('');
    const [selectedTags, setSelectedTags] = useState(pendingDate?.suggestedTags || []);
    const [comments, setComments] = useState('');

    const toggleTag = (tag) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleSave = () => {
        onSave({
            ...pendingDate,
            placeId: selectedPlaceId,
            tags: selectedTags,
            comments: comments
        });
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <button className={styles.backBtn} onClick={onClose}>
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h3 className={styles.title}>Clasificar cita</h3>
                    <div style={{ width: 36 }} /> {/* Spacer */}
                </div>

                <div className={styles.heroSection}>
                    <img src={pendingDate.coverPhoto} alt="Cover" className={styles.heroImg} />
                    <div className={styles.heroBadge}>{pendingDate.photos?.length} fotos</div>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>¿Dónde fue?</label>
                    <select
                        className={styles.select}
                        value={selectedPlaceId}
                        onChange={e => setSelectedPlaceId(e.target.value)}
                    >
                        <option value="">Selecciona un lugar o crea uno nuevo</option>
                        {defaultPlaces?.map(p => (
                            <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Etiquetas</label>
                    <div className={styles.tagsContainer}>
                        {MOCK_ALL_TAGS.map(tag => (
                            <button
                                key={tag}
                                className={`${styles.tagBtn} ${selectedTags.includes(tag) ? styles.tagBtnActive : ''}`}
                                onClick={() => toggleTag(tag)}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Nuestros recuerdos (Opcional)</label>
                    <textarea
                        className={styles.textarea}
                        placeholder="Escribe aquí un resumen bonito de lo que pasó, chistes locales o lo que no quieres olvidar..."
                        value={comments}
                        onChange={e => setComments(e.target.value)}
                        rows={3}
                    />
                </div>

                {pendingDate.isFromBingo && (
                    <div className={styles.bingoBanner}>
                        <span className="material-symbols-outlined">casino</span>
                        Esta cita vino del Bingo de Citas
                    </div>
                )}

                <button
                    className={styles.saveBtn}
                    onClick={handleSave}
                    disabled={!selectedPlaceId}
                >
                    Guardar cita para siempre
                </button>
            </div>
        </div>
    );
}
