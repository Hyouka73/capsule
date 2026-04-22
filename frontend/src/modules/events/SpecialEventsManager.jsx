import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import {
    useSpecialEventManager,
    DISCOVERED_SLUGS,
} from './hooks/useSpecialEventManager';
import EventForm from './components/EventForm';
import EventList from './components/EventList';
import PastelButton from '../../components/ui/PastelButton/PastelButton';
import styles from './SpecialEventsManager.module.css';

/**
 * SpecialEventsManager — Admin view for the Special Event Orchestrator.
 *
 * Rendered inside AdminDashboard when section === 'events'.
 * Guards against non-admin roles internally (parent already guards the route).
 */
export default function SpecialEventsManager() {
    const { relationshipId, role } = useAuth();

    // Guard: admin only
    if (role !== 'admin') {
        return (
            <div className={styles.accessDenied}>
                <span>🔐</span>
                <p>Solo el administrador puede gestionar los eventos especiales.</p>
            </div>
        );
    }

    return <ManagerContent relationshipId={relationshipId} />;
}

function ManagerContent({ relationshipId }) {
    const {
        events,
        isLoading,
        createEvent,
        updateEvent,
        deleteEvent,
        sendTestNotification,
    } = useSpecialEventManager(relationshipId);

    const [showForm, setShowForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null); // null = create mode
    const [isSaving, setIsSaving] = useState(false);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleOpenCreate = () => {
        setEditingEvent(null);
        setShowForm(true);
    };

    const handleOpenEdit = useCallback((event) => {
        setEditingEvent(event);
        setShowForm(true);
    }, []);

    const handleCancel = () => {
        setShowForm(false);
        setEditingEvent(null);
    };

    const handleSubmit = useCallback(async (formData) => {
        setIsSaving(true);
        try {
            if (editingEvent) {
                await updateEvent(editingEvent.id, formData);
            } else {
                await createEvent(formData);
            }
            setShowForm(false);
            setEditingEvent(null);
        } catch {
            // Toast already shown by hook
        } finally {
            setIsSaving(false);
        }
    }, [editingEvent, createEvent, updateEvent]);

    const handleDelete = useCallback(async (event) => {
        await deleteEvent(event.id);
    }, [deleteEvent]);

    const handleToggleActive = useCallback(async (event, newValue) => {
        await updateEvent(event.id, { ...event, isActive: newValue });
    }, [updateEvent]);

    const handleTestNotification = useCallback(async (event) => {
        await sendTestNotification(event);
    }, [sendTestNotification]);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className={styles.root}>
            {/* ── Page heading ── */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <h2 className={styles.pageTitle}>Eventos Especiales 🎉</h2>
                    <p className={styles.pageDesc}>
                        Programa sorpresas con animaciones y notificaciones push.
                    </p>
                </div>

                {!showForm && (
                    <PastelButton
                        variant="primary"
                        onClick={handleOpenCreate}
                        disabled={DISCOVERED_SLUGS.length === 0}
                        title={DISCOVERED_SLUGS.length === 0
                            ? 'Agrega al menos una carpeta en src/assets/animations/'
                            : undefined}
                    >
                        ✨ Nuevo evento
                    </PastelButton>
                )}
            </div>

            {/* ── No animations warning ── */}
            {DISCOVERED_SLUGS.length === 0 && (
                <div className={styles.warning}>
                    <span>⚠️</span>
                    <p>
                        No se detectaron animaciones en <code>src/assets/animations/</code>.
                        Agrega una carpeta con <code>index.jsx</code> para poder crear eventos.
                    </p>
                </div>
            )}

            {/* ── Create / Edit Form ── */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <EventForm
                            initialData={editingEvent}
                            onSubmit={handleSubmit}
                            onCancel={handleCancel}
                            isSaving={isSaving}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Events List ── */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>Eventos Programados</h3>
                    {isLoading && (
                        <span className={styles.loadingBadge}>Cargando…</span>
                    )}
                    {!isLoading && events.length > 0 && (
                        <span className={styles.countBadge}>{events.length}</span>
                    )}
                </div>

                {isLoading ? (
                    <div className={styles.skeletonList}>
                        {[1, 2].map(i => (
                            <div key={i} className={styles.skeletonRow} />
                        ))}
                    </div>
                ) : (
                    <EventList
                        events={events}
                        onEdit={handleOpenEdit}
                        onDelete={handleDelete}
                        onToggleActive={handleToggleActive}
                        onTestNotification={handleTestNotification}
                    />
                )}
            </div>

            {/* ── Debug: discovered slugs ── */}
            {import.meta.env.DEV && DISCOVERED_SLUGS.length > 0 && (
                <details className={styles.devInfo}>
                    <summary>🛠 Animaciones detectadas ({DISCOVERED_SLUGS.length})</summary>
                    <ul>
                        {DISCOVERED_SLUGS.map(s => <li key={s}><code>{s}</code></li>)}
                    </ul>
                </details>
            )}
        </div>
    );
}
