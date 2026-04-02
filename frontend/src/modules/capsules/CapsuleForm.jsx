import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import Button from '../../components/ui/Button/Button';
import KawaiiInput from '../../components/ui/KawaiiInput/KawaiiInput';
import KawaiiSwitch from '../../components/ui/KawaiiSwitch/KawaiiSwitch';
import MediaUploader from '../../components/ui/MediaUploader/MediaUploader';
import { useAppConfig } from '../../context/AppConfigContext';
import styles from './CapsuleForm.module.css';
import { toast } from '../../components/ui/PastelToast/PastelToast';

export default function CapsuleForm({ onSuccess, onCancel, initialData = null }) {
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

    // Helper to format dates for HTML input
    const formatDateForInput = (date) => {
        if (!date) return '';
        const d = date.toDate ? date.toDate() : new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().slice(0, 16);
    };

    // Initial state
    const [formData, setFormData] = useState(() => {
        if (initialData) {
            return {
                ...initialData,
                unlockDate: formatDateForInput(initialData.unlockDate || initialData.unlockAt)
            };
        }
        return {
            title: '',
            teaserMessage: '',
            message: '',
            unlockTrigger: 'date',
            unlockDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
            autoDestroy: true,
            notifyOnUnlock: true,
        };
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

            <div className={styles.splitLayout}>
                {/* ── Columna Principal: El Tesoro ── */}
                <div className={styles.mainColumn}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionIcon}>💌</span>
                        <div className={styles.sectionText}>
                            <h3 className={styles.sectionTitle}>Contenido de la Cápsula</h3>
                            <p className={styles.sectionDesc}>Lo que tu pareja encontrará al abrirla.</p>
                        </div>
                    </div>

                    <div className={styles.formField}>
                        <KawaiiInput
                            type="text"
                            label="Título Secreto"
                            name="title"
                            required
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="Ej: Para nuestra boda, Sorpresa de aniversario..."
                            iconLeft="edit"
                        />
                    </div>

                    <div className={styles.formField}>
                        <KawaiiInput
                            type="textarea"
                            label="Tu Mensaje"
                            name="message"
                            required
                            value={formData.message}
                            onChange={handleChange}
                            placeholder="Escribe aquí tu carta o mensaje secreto para el futuro..."
                            rows={8}
                        />
                    </div>

                    <div className={styles.formField}>
                        <label className={styles.label}>📸 Adjuntos Multimedia</label>
                        <div className={styles.mediaContainerCompact}>
                            <MediaUploader files={files} onChange={setFiles} />
                        </div>
                        {isSubmitting && files.length > 0 && (
                            <div className={styles.progressContainer}>
                                <div className={styles.progressBar} style={{ width: `100%` }} />
                                <span className={styles.progressText}>Preparando envío de {files.length} archivos...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Columna Lateral: Configuración y Reglas ── */}
                <div className={styles.sideColumn}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionIcon}>🔑</span>
                        <div className={styles.sectionText}>
                            <h3 className={styles.sectionTitle}>Reglas de Apertura</h3>
                            <p className={styles.sectionDesc}>¿Cuándo se revelará el secreto?</p>
                        </div>
                    </div>

                    <div className={styles.formField}>
                        <KawaiiInput
                            type="text"
                            label="Mensaje Teaser"
                            name="teaserMessage"
                            required
                            value={formData.teaserMessage}
                            onChange={handleChange}
                            placeholder="Visible antes de abrir... 👋"
                            iconLeft="visibility"
                        />
                    </div>

                    <div className={styles.formField}>
                        <KawaiiInput
                            type="select"
                            label="Activador"
                            name="unlockTrigger"
                            value={formData.unlockTrigger}
                            onChange={handleChange}
                            iconLeft="lock_open"
                            options={[
                                { value: 'date', label: 'Fecha y Hora' },
                                { value: 'manual', label: 'Manual (Tú decides)' }
                            ]}
                        />
                    </div>

                    {formData.unlockTrigger === 'date' && (
                        <div className={styles.formField}>
                            <KawaiiInput
                                type="datetime-local"
                                label="Fecha de Desbloqueo"
                                name="unlockDate"
                                required
                                value={formData.unlockDate}
                                onChange={handleChange}
                                iconLeft="schedule"
                            />
                        </div>
                    )}

                    <div className={styles.configContainer}>
                        <h4 className={styles.configTitle}>Configuración Extra</h4>
                        <div className={styles.configList}>
                            <KawaiiSwitch 
                                checked={formData.autoDestroy} 
                                onChange={(val) => setFormData(prev => ({ ...prev, autoDestroy: val }))} 
                                label="Autodestrucción" 
                                icon="💥"
                                variant="rose"
                            />

                            <KawaiiSwitch 
                                checked={formData.notifyOnUnlock} 
                                onChange={(val) => setFormData(prev => ({ ...prev, notifyOnUnlock: val }))} 
                                label="Notificar al abrir" 
                                icon="🔔"
                                variant="mint"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.actionsSticky}>
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                    className={styles.submitBtn}
                >
                    {isSubmitting ? 'Enterrando...' : 'Enterrar Cápsula ⏳'}
                </Button>
            </div>
        </form>
    );
}
