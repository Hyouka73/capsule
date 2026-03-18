import React from 'react';
import Card from '../../../components/ui/Card/Card';
import KawaiiInput from '../../../components/ui/KawaiiInput/KawaiiInput';
import Button from '../../../components/ui/Button/Button';
import styles from '../BingoManager.module.css';

export default function BingoEditPanel({ editingSquare, formData, setFormData, onSave, onClose }) {
    if (!editingSquare) return null;

    return (
        <Card className={styles.editPanel} glass>
            <div className={styles.panelHeader}>
                <h3>✏️ Editar Casilla</h3>
                <button className={styles.closeBtn} onClick={onClose}>✕</button>
            </div>
            <form onSubmit={onSave} className={styles.editForm}>
                <div className={styles.formRow}>
                    <div className={styles.formGroup} style={{ flex: '0 0 100px' }}>
                        <KawaiiInput 
                            type="text" 
                            label="Emoji" 
                            maxLength="2" 
                            required 
                            value={formData.emoji} 
                            onChange={e => setFormData({ ...formData, emoji: e.target.value })} 
                        />
                    </div>
                    <div className={styles.formGroup} style={{ flex: '1' }}>
                        <KawaiiInput 
                            type="text" 
                            label="Reto o Meta" 
                            required 
                            value={formData.title} 
                            onChange={e => setFormData({ ...formData, title: e.target.value })} 
                        />
                    </div>
                </div>
                <div className={styles.formGroup}>
                    <KawaiiInput
                        type="textarea"
                        label="Descripción / Reglas"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        rows="2"
                        placeholder="Ej. Tómense una foto en la entrada del cine..."
                    />
                </div>
                <div className={styles.formGroup}>
                    <KawaiiInput
                        type="number"
                        label="Mínimo de fotos requeridas"
                        min="1"
                        max="20"
                        required
                        value={formData.minPhotos}
                        onChange={e => setFormData({ ...formData, minPhotos: parseInt(e.target.value) || 1 })}
                    />
                </div>
                <Button type="submit" size="sm">Guardar</Button>
            </form>
        </Card>
    );
}
