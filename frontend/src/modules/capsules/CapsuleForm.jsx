import { useState } from 'react';
import { createCapsule } from '../../apiClient';
import Button from '../../components/ui/Button/Button';
import DescriptiveCheckbox from '../../components/ui/DescriptiveCheckbox/DescriptiveCheckbox';
import KawaiiInput from '../../components/ui/KawaiiInput/KawaiiInput';
import MediaUploader from './components/MediaUploader';
import { uploadFile } from '../../services/storage';
import { STORAGE_PATHS } from '../../config/constants';
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

    const [files, setFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);

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
            let attachments = [];
            
            if (files.length > 0) {
                // Generar un ID temporal para la carpeta si no existe uno
                const tempCapsuleId = crypto.randomUUID();
                
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const fileId = crypto.randomUUID();
                    const ext = file.name.split('.').pop();
                    const path = STORAGE_PATHS.ORIGINAL('capsules', tempCapsuleId, fileId); 
                    // Nota: STORAGE_PATHS.ORIGINAL ya formatea como `type/entityId/fileId.jpg` (o extensión)
                    
                    const url = await uploadFile(file, path, (p) => {
                        // Progreso simple ponderado
                        const totalProgress = ((i / files.length) * 100) + (p / files.length);
                        setUploadProgress(Math.round(totalProgress));
                    });

                    attachments.push({
                        url,
                        storagePath: path,
                        fileName: file.name,
                        fileType: file.type,
                        size: file.size,
                    });
                }
            }

            await createCapsule({
                ...formData,
                attachments
            });
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

            <div className={styles.field}>
                <MediaUploader files={files} onChange={setFiles} />
                {isSubmitting && files.length > 0 && (
                    <div className={styles.progressContainer}>
                        <div className={styles.progressBar} style={{ width: `${uploadProgress}%` }} />
                        <span className={styles.progressText}>Subiendo multimedia: {uploadProgress}%</span>
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
