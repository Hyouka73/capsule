import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import Button from '../../components/ui/Button/Button';
import KawaiiInput from '../../components/ui/KawaiiInput/KawaiiInput';
import KawaiiSwitch from '../../components/ui/KawaiiSwitch/KawaiiSwitch';
import MediaUploader from '../../components/ui/MediaUploader/MediaUploader';
import { useAppConfig } from '../../context/AppConfigContext';
import styles from './CapsuleForm.module.css';
import { toast } from '../../components/ui/PastelToast/PastelToast';
import AudioCraft from './AudioCraft';

export default function CapsuleForm({ onSuccess, onCancel, initialData = null }) {
    const { partnerUid, partnerEmail, relationshipId } = useAppConfig();
    const { queueCapsule } = useOfflineQueue();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true; // Reset on StrictMode re-mount
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Helper to format dates for HTML input
    const formatDateForInput = (date) => {
        if (!date) return '';
        const d = date.toDate ? date.toDate() : new Date(date);
        if (isNaN(d.getTime())) return '';
        
        // Formateo manual para evitar el desfase de toISOString() que es UTC
        const pad = (num) => String(num).padStart(2, '0');
        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hours = pad(d.getHours());
        const minutes = pad(d.getMinutes());
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Initial state
    const [formData, setFormData] = useState(() => {
        if (initialData) {
            return {
                ...initialData,
                // Preserve the capsule ID so the backend knows this is an edit, not a creation
                id: initialData.id,
                unlockDate: formatDateForInput(initialData.unlockDate || initialData.unlockAt)
            };
        }
        return {
            title: '',
            teaserMessage: '',
            message: '',
            unlockTrigger: 'date',
            unlockDate: formatDateForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
            autoDestroy: true,
            notifyOnUnlock: true,
        };
    });

    const [step, setStep] = useState(1); // 1: Essence (Type), 2: Heart (Content), 3: Seal (Rules)
    const [files, setFiles] = useState([]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const nextStep = () => setStep(prev => Math.min(prev + 1, 3));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const handleTypeSelect = (type) => {
        setFormData(prev => ({ ...prev, type }));
        nextStep();
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError(null);

        if (!relationshipId || !partnerUid) {
            setError('Error crítico: No se detectó una relación activa o un Partner asignado.');
            return;
        }

        setIsSubmitting(true);

        try {
            // CRITICAL: Only send fields the backend expects.
            const cleanPayload = {
                id: formData.id || undefined,
                title: formData.title,
                teaserMessage: formData.teaserMessage,
                message: formData.message,
                type: formData.type || 'message',
                unlockTrigger: formData.unlockTrigger,
                unlockDate: formData.unlockDate ? new Date(formData.unlockDate).toISOString() : null,
                autoDestroy: formData.autoDestroy,
                notifyOnUnlock: formData.notifyOnUnlock,
                relationshipId,
                recipientUid: partnerUid,
            };

            const res = await queueCapsule(cleanPayload, files);

            if (res.queued) {
                const isEdit = !!initialData?.id;
                toast.success(
                    isEdit ? '¡Cambios sellados! ✨' : '¡Cápsula enterrada! ⏳',
                    isEdit ? 'Tu recuerdo se está actualizando...' : 'Se abrirá en el momento indicado.'
                );
                onSuccess(cleanPayload);
            } else {
                setError('No se pudo sellar la cápsula. Intenta de nuevo.');
            }
        } catch (err) {
            console.error('[CapsuleForm] Error:', err);
            if (isMounted.current) {
                setError(err.message || 'Error inesperado al sellar el recuerdo.');
            }
        } finally {
            if (isMounted.current) setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.wizardContainer}>
            {/* Cabecera del Progreso */}
            <div className={styles.progressHeader}>
                <div className={`${styles.dot} ${step >= 1 ? styles.dotActive : ''}`} />
                <div className={`${styles.line} ${step >= 2 ? styles.lineActive : ''}`} />
                <div className={`${styles.dot} ${step >= 2 ? styles.dotActive : ''}`} />
                <div className={`${styles.line} ${step >= 3 ? styles.lineActive : ''}`} />
                <div className={`${styles.dot} ${step >= 3 ? styles.dotActive : ''}`} />
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
                {error && <div className={styles.error}>{error}</div>}

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div 
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className={styles.stepContent}
                        >
                            <h2 className={styles.stepTitle}>¿Qué vas a regalar hoy?</h2>
                            <p className={styles.stepDesc}>Elige la esencia de tu recuerdo ✨</p>
                            
                            <div className={styles.typeGrid}>
                                <button type="button" className={styles.typeItem} onClick={() => handleTypeSelect('message')}>
                                    <div className={styles.typeIcon}>💌</div>
                                    <span>Carta de Amor</span>
                                </button>
                                <button type="button" className={styles.typeItem} onClick={() => handleTypeSelect('audio')}>
                                    <div className={styles.typeIcon}>🎙️</div>
                                    <span>Nota de Voz</span>
                                </button>
                                <button type="button" className={styles.typeItem} onClick={() => handleTypeSelect('photo')}>
                                    <div className={styles.typeIcon}>📸</div>
                                    <span>Galería</span>
                                </button>
                                <button type="button" className={styles.typeItem} onClick={() => handleTypeSelect('link')}>
                                    <div className={styles.typeIcon}>🔗</div>
                                    <span>Recuerdo Web</span>
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Próximos pasos se implementarán en el siguiente turno */}
                    {step === 2 && (
                        <motion.div 
                            key="step2" 
                            initial={{ opacity: 0, x: 20 }} 
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className={styles.stepContent}
                        >
                            <h2 className={styles.stepTitle}>
                                {formData.type === 'message' && 'Escribe tu Carta 💌'}
                                {formData.type === 'photo' && 'Tu Galería de Recuerdos 📸'}
                                {formData.type === 'audio' && 'Tu Mensaje de Voz 🎙️'}
                                {formData.type === 'link' && 'Compartir un Enlace 🔗'}
                            </h2>
                            <p className={styles.stepDesc}>Dale forma a lo que quieres decir... ✨</p>
                            
                            <div className={styles.contentWrapper}>
                                {formData.type === 'message' && (
                                    <div className={styles.letterContainer}>
                                        <textarea
                                            name="message"
                                            className={styles.paperTextarea}
                                            value={formData.message}
                                            onChange={handleChange}
                                            placeholder="Escribe aquí tu carta secreta..."
                                            required
                                            rows={12}
                                        />
                                    </div>
                                )}

                                {formData.type === 'photo' && (
                                    <div className={styles.galleryContainer}>
                                        <MediaUploader files={files} onChange={setFiles} />
                                        <textarea
                                            name="message"
                                            className={styles.captionArea}
                                            value={formData.message}
                                            onChange={handleChange}
                                            placeholder="Escribe aquí una dedicatoria o historia sobre estas fotos... ✨"
                                        />
                                    </div>
                                )}

                                {formData.type === 'audio' && (
                                    <AudioCraft 
                                        onAudioChange={(file) => setFiles(file ? [file] : [])} 
                                        existingAudio={initialData?.files?.find(f => f.mimeType.includes('audio'))?.url}
                                    />
                                )}

                                {formData.type === 'link' && (
                                    <div className={styles.linkContainer}>
                                        <KawaiiInput
                                            type="url"
                                            label="Enlace (URL)"
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            placeholder="https://spotify.com/cancion-especial"
                                            iconLeft="link"
                                            required
                                        />
                                    </div>
                                )}
                            </div>
                            
                            <div className={styles.stepActions}>
                                <Button 
                                    type="button" 
                                    onClick={prevStep} 
                                    variant="ghost"
                                    className={styles.navBtn}
                                >
                                    Atrás
                                </Button>
                                <Button 
                                    type="button" 
                                    onClick={nextStep}
                                    className={styles.navBtn}
                                >
                                    Siguiente
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div 
                            key="step3" 
                            initial={{ opacity: 0, x: 20 }} 
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className={styles.stepContent}
                        >
                            <h2 className={styles.stepTitle}>El Sello del Tiempo ⏳</h2>
                            <p className={styles.stepDesc}>Define cómo y cuándo se revelará tu secreto.</p>

                            <div className={styles.sealFields}>
                                <div className={styles.fieldRow}>
                                    <KawaiiInput
                                        type="text"
                                        label="Título de la Cápsula"
                                        name="title"
                                        required
                                        value={formData.title}
                                        onChange={handleChange}
                                        placeholder="Ej: Lo que te dije aquel día..."
                                        iconLeft="edit"
                                    />
                                </div>
                                
                                <div className={styles.fieldRow}>
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

                                <div className={styles.fieldRow}>
                                    <KawaiiInput
                                        type="select"
                                        label="Modo de Apertura"
                                        name="unlockTrigger"
                                        value={formData.unlockTrigger}
                                        onChange={handleChange}
                                        iconLeft="lock_open"
                                        options={[
                                            { value: 'date', label: 'Programar Fecha' },
                                            { value: 'manual', label: 'Tú la abres' }
                                        ]}
                                    />
                                </div>

                                {formData.unlockTrigger === 'date' && (
                                    <div className={styles.fieldRow}>
                                        <KawaiiInput
                                            type="datetime-local"
                                            label="¿Cuándo se libera?"
                                            name="unlockDate"
                                            required
                                            value={formData.unlockDate}
                                            onChange={handleChange}
                                            iconLeft="schedule"
                                        />
                                    </div>
                                )}

                                <div className={styles.configGrid}>
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
                                        label="Avisarte al abrir" 
                                        icon="🔔"
                                        variant="mint"
                                    />
                                </div>
                            </div>

                            <div className={styles.stepActions}>
                                <Button 
                                    type="button" 
                                    onClick={prevStep} 
                                    variant="ghost"
                                    className={styles.navBtn}
                                >
                                    Regresar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    isLoading={isSubmitting}
                                    className={`${styles.navBtn} ${styles.finishBtn}`}
                                >
                                    {isSubmitting ? 'Sellando...' : 'Sellar Cápsula ✨'}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </form>
        </div>
    );
}
