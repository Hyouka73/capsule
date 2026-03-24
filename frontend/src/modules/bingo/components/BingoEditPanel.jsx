import React from 'react';
import { createPortal } from 'react-dom';
import KawaiiInput from '../../../components/ui/KawaiiInput/KawaiiInput';
import { useAppConfig } from '../../../context/AppConfigContext';
import styles from '../BingoManager.module.css';

export default function BingoEditPanel({ 
    editingSquare, 
    formData, 
    setFormData, 
    onSave, 
    onClose,
    onUncheck,
    onForceComplete
}) {
    const { memoryTags } = useAppConfig();
    if (!editingSquare) return null;

    // formData.suggestedTags is an ARRAY of OBJECTS: { value, label }
    const currentTags = formData.suggestedTags || [];

    const toggleTag = (opt) => {
        const exists = currentTags.some(t => t.value === opt.value);
        if (exists) {
            setFormData({ 
                ...formData, 
                suggestedTags: currentTags.filter(t => t.value !== opt.value) 
            });
        } else {
            setFormData({ 
                ...formData, 
                suggestedTags: [...currentTags, { value: opt.value, label: opt.label }] 
            });
        }
    };

    const isCompleted = editingSquare.isCompleted || editingSquare.completedMemoryId;

    return createPortal(
        <>
            <div 
                className={`${styles.drawerOverlay} ${editingSquare ? styles.visible : ''}`} 
                onClick={onClose}
            />
            <div className={`${styles.editPanel} ${editingSquare ? styles.open : ''}`}>
                <div className={styles.panelHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className="material-symbols-outlined" style={{ color: '#8b4a61', fontSize: '1.75rem' }}>edit_square</span>
                        <h3>Editar Casilla</h3>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={e => { e.preventDefault(); onSave(); }} className={styles.editForm}>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup} style={{ flex: '0 0 90px' }}>
                            <KawaiiInput 
                                type="text" 
                                label="Emoji" 
                                maxLength="2" 
                                required 
                                value={formData.emoji} 
                                onChange={e => setFormData({ ...formData, emoji: e.target.value })} 
                                placeholder="🎯"
                            />
                        </div>
                        <div className={styles.formGroup} style={{ flex: '1' }}>
                            <KawaiiInput 
                                type="text" 
                                label="Reto o Meta" 
                                required 
                                value={formData.title} 
                                onChange={e => setFormData({ ...formData, title: e.target.value })} 
                                placeholder="Ej. Cena romántica"
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Tags Automáticos</label>
                        <p style={{ fontSize: '0.75rem', color: '#847377', marginBottom: '12px' }}>
                            Las fotos con estos "tags" marcarán esta casilla automáticamente.
                        </p>
                        <div className={styles.tagsGrid}>
                            {(memoryTags || []).map(opt => {
                                const isActive = currentTags.some(t => t.value === opt.value);
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => toggleTag(opt)}
                                        className={`${styles.tagBtn} ${isActive ? styles.active : ''}`}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <KawaiiInput
                            type="textarea"
                            label="Descripción / Reglas"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows="2"
                            placeholder="Ej. Tómense una foto disfrutando de una cena especial..."
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <KawaiiInput
                            type="number"
                            label="Mínimo de fotos"
                            min="1"
                            max="20"
                            required
                            value={formData.minPhotos}
                            onChange={e => setFormData({ ...formData, minPhotos: parseInt(e.target.value) || 1 })}
                        />
                    </div>
                </form>

                <div className={styles.panelFooter}>
                    <button type="button" className={styles.saveBtn} onClick={onSave}>
                        <span className="material-symbols-outlined">save</span>
                        Guardar Cambios
                    </button>
                    
                    {isCompleted ? (
                        <button 
                            type="button" 
                            className={`${styles.resetBtn} ${styles.danger}`} 
                            onClick={() => onUncheck(editingSquare.id)}
                        >
                            <span className="material-symbols-outlined">restart_alt</span>
                            Resetear Progreso
                        </button>
                    ) : (
                        <button 
                            type="button" 
                            className={styles.resetBtn} 
                            onClick={() => onForceComplete(editingSquare.id)}
                        >
                            <span className="material-symbols-outlined">check_circle</span>
                            Forzar Cumplido
                        </button>
                    )}
                </div>
            </div>
        </>,
        document.body
    );
}
