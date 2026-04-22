import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PastelButton from '../../../components/ui/PastelButton/PastelButton';
import styles from './EventList.module.css';

const ROLE_LABELS = { partner: '👤 Pareja', admin: '🔑 Admin', both: '👥 Ambos' };

/**
 * EventList — Table of existing SpecialEvents.
 *
 * Props:
 *   events             {array}
 *   onEdit             {(event) => void}
 *   onDelete           {(event) => void}
 *   onToggleActive     {(event, newValue) => void}
 *   onTestNotification {(event) => void}
 */
export default function EventList({ events, onEdit, onDelete, onToggleActive, onTestNotification }) {
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    if (events.length === 0) {
        return (
            <div className={styles.empty}>
                <span className={styles.emptyIcon}>🗓️</span>
                <p className={styles.emptyText}>No hay eventos programados aún.</p>
                <p className={styles.emptyHint}>Usa el formulario de arriba para crear el primero.</p>
            </div>
        );
    }

    return (
        <div className={styles.tableWrapper}>
            <div className={styles.tableHeader}>
                <span>Evento</span>
                <span>Activación</span>
                <span>Estado</span>
                <span>Acciones</span>
            </div>

            <div className={styles.tableBody}>
                <AnimatePresence initial={false}>
                    {events.map(event => (
                        <motion.div
                            key={event.id}
                            className={`${styles.row} ${!event.isActive ? styles.rowInactive : ''}`}
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Title / Slug */}
                            <div className={styles.cellTitle}>
                                <span className={styles.eventTitle}>{event.title || event.animationSlug}</span>
                            </div>

                            {/* Unlock date */}
                            <div className={styles.cell}>
                                <span className={styles.date}>
                                    {formatDate(event.unlockDateTime)}
                                </span>
                            </div>

                            {/* Lifecycle Status */}
                            <div className={styles.cell}>
                                {getEventStatusBadge(event)}
                            </div>

                            {/* Actions */}
                            <div className={`${styles.cell} ${styles.cellActions}`}>
                                <PastelButton
                                    variant="ghost"
                                    onClick={() => onTestNotification(event)}
                                    title="Enviar notificación de prueba ahora"
                                    className={styles.actionBtn}
                                >
                                    🔔
                                </PastelButton>

                                {(!event.dispatchedAt && !event.seenAt) && (
                                    <PastelButton
                                        variant="ghost"
                                        onClick={() => onEdit(event)}
                                        title="Editar evento"
                                        className={styles.actionBtn}
                                    >
                                        ✏️
                                    </PastelButton>
                                )}

                                {confirmDeleteId === event.id ? (
                                    <div className={styles.confirmRow}>
                                        <PastelButton
                                            variant="primary"
                                            onClick={() => { onDelete(event); setConfirmDeleteId(null); }}
                                            className={styles.actionBtn}
                                        >
                                            ✓ Sí
                                        </PastelButton>
                                        <PastelButton
                                            variant="ghost"
                                            onClick={() => setConfirmDeleteId(null)}
                                            className={styles.actionBtn}
                                        >
                                            ✗
                                        </PastelButton>
                                    </div>
                                ) : (
                                    <PastelButton
                                        variant="ghost"
                                        onClick={() => setConfirmDeleteId(event.id)}
                                        title="Eliminar evento"
                                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                    >
                                        🗑️
                                    </PastelButton>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso) {
    if (!iso) return '—';
    try {
        return new Intl.DateTimeFormat('es-MX', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        }).format(new Date(iso));
    } catch {
        return iso;
    }
}

function isUnlocked(iso) {
    if (!iso) return false;
    return new Date(iso).getTime() <= Date.now();
}

function getEventStatusBadge(event) {
    if (!event.isActive) {
        return <span className={styles.badgeInactive}>⏸ Pausado</span>;
    }
    if (event.seenAt) {
        return <span className={styles.badgeSeen}>👀 Ya lo vio</span>;
    }
    if (event.dispatchedAt) {
        return <span className={styles.badgeNotified}>🔔 Notificado</span>;
    }
    if (isUnlocked(event.unlockDateTime)) {
        return <span className={styles.badgeActive}>🔓 Activo</span>;
    }
    return <span className={styles.badgePending}>⏳ Pendiente</span>;
}
