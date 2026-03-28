import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import Button from '../../components/ui/Button/Button';
import DescriptiveCheckbox from '../../components/ui/DescriptiveCheckbox/DescriptiveCheckbox';
import KawaiiInput from '../../components/ui/KawaiiInput/KawaiiInput';
import MediaUploader from './components/MediaUploader';
import { useAppConfig } from '../../context/AppConfigContext';
import styles from './CapsuleForm.module.css';
import { toast } from '../../components/ui/PastelToast/PastelToast';

export default function CapsuleForm({ onSuccess, onCancel }) {
    const { partnerUid, partnerEmail, relationshipId } = useAppConfig();
    const { queueCapsule } = useOfflineQueue();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Initial state
    const [formData, setFormData] = useState({
        title: '',
        teaserMessage: '',
        message: '',
        unlockTrigger: 'date',
        unlockDate: '',
        autoDestroy: true,
        notifyOnUnlock: true,
    });

    const [files, setFiles] = useState([]);

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

        if (!relationshipId || !partnerUid) {
            setError('Error crítico: No se detectó una relación activa o un Partner asignado.');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await queueCapsule({
                ...formData,
                relationshipId,
                recipientUid: partnerUid,
            }, files);

            if (!isMounted.current) return;

            if (res.queued) {
                toast.success('¡Cápsula enterrada!', 'Se sincronizará en cuanto haya conexión ✨');
                onSuccess();
            } else {
                setError('No se pudo encolar la cápsula. Intenta de nuevo.');
            }
        } catch (err) {
            if (!isMounted.current) return;
            setError(err.message || 'Ocurrió un error inesperado al guardar la cápsula.');
        } finally {
            if (isMounted.current) setIsSubmitting(false);
        }
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.field}>
                <KawaiiInput
                    type="text"
                    label="Título (Secreto Interno)"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Ej. Aniversario 2026, San Valentín..."
                />
            </div>

            <div className={styles.field}>
                <KawaiiInput
                    type="text"
                    label="Mensaje Gancho / Teaser (Visible antes de abrir)"
                    name="teaserMessage"
                    required
                    value={formData.teaserMessage}
                    onChange={handleChange}
                    placeholder="Ej. No abras esto hasta estar sola..."
                />
            </div>

            <div className={styles.row}>
                <div className={styles.field}>
                    <KawaiiInput
                        type="select"
                        label="Condición de Apertura"
                        name="unlockTrigger"
                        value={formData.unlockTrigger}
                        onChange={handleChange}
                        options={[
                            { value: 'date', label: 'Fecha y Hora Específica' },
                            { value: 'manual', label: 'Manual (Tú decides cuándo)' }
                        ]}
                    />
                </div>

                {formData.unlockTrigger === 'date' && (
                    <div className={styles.field}>
                        <KawaiiInput
                            type="date"
                            label="Fecha de Desbloqueo"
                            name="unlockDate"
                            required
                            value={formData.unlockDate}
                            onChange={handleChange}
                        />
                    </div>
                )}
            </div>

            <div className={styles.field}>
                <KawaiiInput
                    type="textarea"
                    label="El Mensaje Secreto"
                    name="message"
                    required
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Escribe la carta o mensaje que quieres que lea..."
                />
            </div>

            <div className={styles.partnerInfo}>
                <p>👤 <b>Partner:</b> {partnerEmail || 'Cargando...'}</p>
                <p>🔗 <b>Relación:</b> <small>{relationshipId}</small></p>
                <p className={styles.warning}>⚠️ Esta cápsula solo será visible para este destinatario.</p>
            </div>

            <div className={styles.checkboxContainer}>
                <DescriptiveCheckbox
                    name="autoDestroy"
                    checked={formData.autoDestroy}
                    onChange={handleChange}
                    title="💥 Autodestrucción Rápida (Modal 30s)"
                    description="La cápsula se eliminará por completo de la base de datos y de las fotos tras ser abierta."
                />

                <DescriptiveCheckbox
                    name="notifyOnUnlock"
                    checked={formData.notifyOnUnlock}
                    onChange={handleChange}
                    title="🔔 Notificación Push (Cloud Tasks)"
                    description="Dará un aviso inmediato en el momento exacto del desbloqueo."
                />
            </div>

            <div className={styles.field}>
                <MediaUploader files={files} onChange={setFiles} />
                {isSubmitting && files.length > 0 && (
                    <div className={styles.progressContainer}>
                        <div className={styles.progressBar} style={{ width: `100%` }} />
                        <span className={styles.progressText}>Preparando para segundo plano...</span>
                    </div>
                )}
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
