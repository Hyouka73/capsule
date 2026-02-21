import { useState } from 'react';
import { createCapsule } from '../../apiClient';
import Button from '../../components/ui/Button/Button';
import DescriptiveCheckbox from '../../components/ui/DescriptiveCheckbox/DescriptiveCheckbox';
import styles from './CapsuleForm.module.css';

export default function CapsuleForm({ onSuccess, onCancel }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Initial state
    const [formData, setFormData] = useState({
        title: '',
        teaserMessage: '',
        message: '',
        unlockTrigger: 'date',
        unlockDate: '',
        autoDestruct: true,
        notifyOnUnlock: true,
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await createCapsule(formData);
            onSuccess();
        } catch (err) {
            console.error('Error creating capsule:', err);
            setError(err.message || 'Ocurrió un error inesperado al guardar la cápsula.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.field}>
                <label>Título (Secreto Interno)</label>
                <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Ej. Aniversario 2026, San Valentín..."
                />
            </div>

            <div className={styles.field}>
                <label>Mensaje Gancho / Teaser (Visible antes de abrir)</label>
                <input
                    type="text"
                    name="teaserMessage"
                    required
                    value={formData.teaserMessage}
                    onChange={handleChange}
                    placeholder="Ej. No abras esto hasta estar sola..."
                />
            </div>

            <div className={styles.row}>
                <div className={styles.field}>
                    <label>Condición de Apertura</label>
                    <select name="unlockTrigger" value={formData.unlockTrigger} onChange={handleChange}>
                        <option value="date">Fecha y Hora Específica</option>
                        <option value="manual">Manual (Tú decides cuándo)</option>
                    </select>
                </div>

                {formData.unlockTrigger === 'date' && (
                    <div className={styles.field}>
                        <label>Fecha de Desbloqueo</label>
                        <input
                            type="datetime-local"
                            name="unlockDate"
                            required
                            value={formData.unlockDate}
                            onChange={handleChange}
                        />
                    </div>
                )}
            </div>

            <div className={styles.field}>
                <label>El Mensaje Secreto</label>
                <textarea
                    name="message"
                    required
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Escribe la carta o mensaje que quieres que lea..."
                />
            </div>

            <div className={styles.checkboxContainer}>
                <DescriptiveCheckbox
                    name="autoDestruct"
                    checked={formData.autoDestruct}
                    onChange={handleChange}
                    title="💥 Autodestrucción Rápida (Read-Once)"
                    description="La cápsula se fulminará para siempre inmediatamente después de que ella la lea."
                />

                <DescriptiveCheckbox
                    name="notifyOnUnlock"
                    checked={formData.notifyOnUnlock}
                    onChange={handleChange}
                    title="🔔 Notificación Push (Cloud Tasks)"
                    description="Despertará su teléfono en el instante milimétrico de la fecha de apertura elegida."
                />
            </div>

            <div className={styles.actions}>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                >
                    {isSubmitting ? 'Enterrando...' : 'Enterrar Cápsula'}
                </Button>
            </div>
        </form>
    );
}
