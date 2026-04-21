import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PastelButton from '../../../components/ui/PastelButton/PastelButton';
import KawaiiSwitch from '../../../components/ui/KawaiiSwitch/KawaiiSwitch';
import {
    DISCOVERED_SLUGS,
    localDatetimeToISO,
    isoToLocalDatetime,
} from '../hooks/useSpecialEventManager';
import styles from './EventForm.module.css';

const EMPTY_FORM = {
    title: '',
    animationSlug: DISCOVERED_SLUGS[0] || '',
    unlockDatetimeLocal: '',  // internal: "YYYY-MM-DDTHH:mm"
    notifTitle: '🎉 ¡Hay una sorpresa para ti!',
    notifBody: 'Abre la app para descubrirla...',
    notifLink: '',
    targetRole: 'partner',
    isPersistent: true,
    isActive: true,
};

/**
 * EventForm — Create / Edit form for a SpecialEvent.
 *
 * Props:
 *   initialData  {object|null}  — Event to edit (null = create mode)
 *   onSubmit     {function}     — Called with sanitized payload
 *   onCancel     {function}     — Called to dismiss without saving
 *   isSaving     {boolean}
 */
export default function EventForm({ initialData, onSubmit, onCancel, isSaving }) {
    const [form, setForm] = useState(EMPTY_FORM);

    // Populate form when editing an existing event
    useEffect(() => {
        if (initialData) {
            const nc = initialData.notificationConfig || {};
            setForm({
                title:                initialData.title || '',
                animationSlug:        initialData.animationSlug || DISCOVERED_SLUGS[0] || '',
                unlockDatetimeLocal:  isoToLocalDatetime(initialData.unlockDateTime),
                notifTitle:           nc.title || '🎉 ¡Hay una sorpresa para ti!',
                notifBody:            nc.body  || 'Abre la app para descubrirla...',
                notifLink:            nc.link  || '',
                targetRole:           initialData.targetRole  || 'partner',
                isPersistent:         initialData.isPersistent  ?? true,
                isActive:             initialData.isActive      ?? true,
            });
        } else {
            setForm(EMPTY_FORM);
        }
    }, [initialData]);

    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    const handleSubmit = (e) => {
        e.preventDefault();
        const iso = localDatetimeToISO(form.unlockDatetimeLocal);
        if (!iso) {
            return; // datetime-local required validation handles this
        }
        // Build the auto deep-link if blank
        const eventId = initialData?.id || 'new';
        const deepLink = form.notifLink.trim()
            || `/?action=special_event&eventId=${eventId}`;

        onSubmit({
            ...form,
            unlockDateTime: iso,
            notifLink: deepLink,
        });
    };

    const isEditing = Boolean(initialData);

    return (
        <motion.form
            className={styles.form}
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <div className={styles.formHeader}>
                <span className={styles.formHeaderIcon}>{isEditing ? '✏️' : '✨'}</span>
                <h3 className={styles.formTitle}>
                    {isEditing ? 'Editar Evento' : 'Nuevo Evento Especial'}
                </h3>
            </div>

            {/* ── Section: General ─────────────────────────────────── */}
            <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>General</legend>

                <div className={styles.field}>
                    <label className={styles.label} htmlFor="ev-title">
                        Título interno <span className={styles.req}>*</span>
                    </label>
                    <input
                        id="ev-title"
                        className={styles.input}
                        type="text"
                        placeholder="Ej: Cumpleaños de mi amor"
                        value={form.title}
                        onChange={e => set('title', e.target.value)}
                        required
                    />
                </div>

                <div className={styles.fieldRow}>
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="ev-slug">
                            Animación <span className={styles.req}>*</span>
                        </label>
                        <select
                            id="ev-slug"
                            className={styles.select}
                            value={form.animationSlug}
                            onChange={e => set('animationSlug', e.target.value)}
                            required
                        >
                            {DISCOVERED_SLUGS.length === 0 && (
                                <option value="">— Sin animaciones —</option>
                            )}
                            {DISCOVERED_SLUGS.map(slug => (
                                <option key={slug} value={slug}>{slug}</option>
                            ))}
                        </select>
                        <span className={styles.hint}>
                            Carpetas en <code>src/assets/animations/</code>
                        </span>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="ev-unlock">
                            Fecha y hora de activación <span className={styles.req}>*</span>
                        </label>
                        <input
                            id="ev-unlock"
                            className={styles.input}
                            type="datetime-local"
                            value={form.unlockDatetimeLocal}
                            onChange={e => set('unlockDatetimeLocal', e.target.value)}
                            required
                        />
                        <span className={styles.hint}>Se guarda como ISO en Firestore</span>
                    </div>
                </div>

                <div className={styles.field}>
                    <label className={styles.label} htmlFor="ev-role">
                        Destinatario
                    </label>
                    <select
                        id="ev-role"
                        className={styles.select}
                        value={form.targetRole}
                        onChange={e => set('targetRole', e.target.value)}
                    >
                        <option value="partner">👤 Solo la Pareja</option>
                        <option value="admin">🔑 Solo el Admin</option>
                        <option value="both">👥 Ambos</option>
                    </select>
                </div>
            </fieldset>

            {/* ── Section: Notificación Push ────────────────────────── */}
            <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Notificación Push</legend>

                <div className={styles.field}>
                    <label className={styles.label} htmlFor="ev-notif-title">
                        Título del push <span className={styles.req}>*</span>
                    </label>
                    <input
                        id="ev-notif-title"
                        className={styles.input}
                        type="text"
                        placeholder="🎉 ¡Hay una sorpresa para ti!"
                        value={form.notifTitle}
                        onChange={e => set('notifTitle', e.target.value)}
                        required
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.label} htmlFor="ev-notif-body">
                        Cuerpo del mensaje <span className={styles.req}>*</span>
                    </label>
                    <textarea
                        id="ev-notif-body"
                        className={`${styles.input} ${styles.textarea}`}
                        placeholder="Abre la app para descubrirla..."
                        value={form.notifBody}
                        onChange={e => set('notifBody', e.target.value)}
                        rows={2}
                        required
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.label} htmlFor="ev-notif-link">
                        Deep-link <span className={styles.optional}>(auto-generado si vacío)</span>
                    </label>
                    <input
                        id="ev-notif-link"
                        className={styles.input}
                        type="text"
                        placeholder="/?action=special_event&eventId=..."
                        value={form.notifLink}
                        onChange={e => set('notifLink', e.target.value)}
                    />
                </div>
            </fieldset>

            {/* ── Section: Comportamiento ────────────────────────────── */}
            <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Comportamiento</legend>

                <KawaiiSwitch
                    checked={form.isPersistent}
                    onChange={val => set('isPersistent', val)}
                    label="Overlay persistente"
                    description="Si activo, el usuario debe cerrar la animación manualmente."
                    icon="📌"
                    variant="rose"
                />

                <KawaiiSwitch
                    checked={form.isActive}
                    onChange={val => set('isActive', val)}
                    label="Evento activo"
                    description="Desactiva para pausar sin borrar el evento."
                    icon="✅"
                    variant="mint"
                />
            </fieldset>

            {/* ── Actions ───────────────────────────────────────────── */}
            <div className={styles.actions}>
                <PastelButton
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    disabled={isSaving}
                >
                    Cancelar
                </PastelButton>
                <PastelButton
                    type="submit"
                    variant="primary"
                    isLoading={isSaving}
                    disabled={DISCOVERED_SLUGS.length === 0}
                >
                    {isEditing ? '💾 Guardar cambios' : '✨ Crear evento'}
                </PastelButton>
            </div>
        </motion.form>
    );
}
