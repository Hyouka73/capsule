import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { useAppConfig } from '../../context/AppConfigContext';
import { createMemory } from '../../apiClient';
import Button from '../../components/ui/Button/Button';
import KawaiiInput from '../../components/ui/KawaiiInput/KawaiiInput';
import MediaUploader from '../capsules/components/MediaUploader';
import styles from './MemoryForm.module.css';
import { toast } from '../../components/ui/PastelToast/PastelToast';

export default function MemoryForm({ onSuccess, onCancel, initialData = null, bingoOrigin = null }) {
    const { relationshipId } = useAuth();
    const { queueMemory } = useOfflineQueue();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    const [formData, setFormData] = useState(initialData || {
        title: '',
        description: '',
        eventDate: new Date().toISOString().split('T')[0],
        tags: [],
        placeName: '',
        placeLat: null,
        placeLng: null,
    });

    const [files, setFiles] = useState([]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!relationshipId) {
            setError('No hay una relación activa detectada.');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await queueMemory(formData, files, null, bingoOrigin);

            if (!isMounted.current) return;

            if (res.queued) {
                toast.success('Recuerdo guardado 💖', 'Se sincronizará en segundo plano ✨');
                onSuccess();
            } else {
                setError('No se pudo guardar el recuerdo. Intenta de nuevo.');
            }
        } catch (err) {
            if (!isMounted.current) return;
            setError(err.message || 'Error al guardar el recuerdo.');
        } finally {
            if (isMounted.current) setIsSubmitting(false);
        }
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.field}>
                <KawaiiInput
                    label="¿Qué pasó hoy? ✨"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Título del recuerdo..."
                />
            </div>

            <div className={styles.field}>
                <KawaiiInput
                    type="date"
                    label="Fecha del momento"
                    name="eventDate"
                    required
                    value={formData.eventDate}
                    onChange={handleChange}
                />
            </div>

            <div className={styles.field}>
                <KawaiiInput
                    type="textarea"
                    label="Cuéntame más... 📝"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Escribe aquí los detalles..."
                />
            </div>

            <div className={styles.field}>
                <MediaUploader files={files} onChange={setFiles} />
            </div>

            <div className={styles.actions}>
                <Button variant="ghost" type="button" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando...' : 'Guardar Recuerdo'}
                </Button>
            </div>
        </form>
    );
}
