import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
        <motion.div
            className={styles.overlay}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
            <div className={styles.orbTopLeft}></div>

            <div className={styles.contentWrapper}>
                <div className={styles.header}>
                    <button className={styles.backBtn} onClick={onClose}>
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h2 className={styles.title}>Clasificar cita</h2>
                    <div style={{ width: 40 }} /> {/* Spacer to keep title centered */}
                </div>

                <div className={styles.heroSection}>
                    <img src={pendingDate.coverPhoto} alt="Cover" className={styles.heroImg} />
                    <div className={styles.heroBadge}>{pendingDate.photos?.length || 0} {pendingDate.photos?.length === 1 ? 'foto' : 'fotos'}</div>
                    {pendingDate.photos?.length > 1 && (
                        <div className={styles.pageDots}>
                            {pendingDate.photos.map((_, i) => (
                                <div key={i} className={`${styles.dot} ${i === 0 ? styles.dotActive : ''}`} />
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>¿Dónde fue?</label>
                    <div className={styles.inputWrapper}>
                        <span className={`material-symbols-outlined ${styles.inputIcon}`}>location_on</span>
                        <select
                            className={`${styles.select} ${!selectedPlaceId ? styles.placeholder : ''}`}
                            value={selectedPlaceId}
                            onChange={e => setSelectedPlaceId(e.target.value)}
                        >
                            <option value="">Selecciona un lugar o crea uno nuevo</option>
                            {defaultPlaces?.map(p => (
                                <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                            ))}
                        </select>
                    </div>
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
                    <label className={styles.label}>
                        Nuestros recuerdos
                        <span className={styles.optionalBadge}>(Opcional)</span>
                    </label>
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
                    <span className="material-symbols-outlined">favorite</span>
                </button>
            </div>
        </motion.div>
    );
}
