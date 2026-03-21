import { useState, useEffect } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { COLLECTIONS } from '../../config/constants';
import { getCapsules, openCapsule } from '../../apiClient';
import CapsuleForm from './CapsuleForm';
import Button from '../../components/ui/Button/Button';
import Card from '../../components/ui/Card/Card';
import PageHeader from '../../components/ui/PageHeader/PageHeader';
import EmptyState from '../../components/ui/EmptyState/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import { toast } from '../../components/ui/PastelToast/PastelToast';
import styles from './CapsuleManager.module.css';

export default function CapsuleManager() {
    const [capsules, setCapsules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCapsule, setEditingCapsule] = useState(null);

    // Confirm Modal State
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        variant: 'default',
        emoji: '👋'
    });

    useEffect(() => {
        loadCapsules();
    }, []);

    async function loadCapsules() {
        setIsLoading(true);
        try {
            const result = await getCapsules();
            setCapsules(result.docs || []);
        } catch (err) {
            console.error('Error loading capsules:', err);
            toast.error('Error al cargar cápsulas');
        } finally {
            setIsLoading(false);
        }
    }

    const handleCreated = () => {
        setShowForm(false);
        setEditingCapsule(null);
        loadCapsules();
    };

    const handleDelete = (id) => {
        setConfirmState({
            isOpen: true,
            title: '¿Eliminar Cápsula?',
            message: 'Esta acción no se puede deshacer. Se borrarán todos los datos y archivos asociados.',
            variant: 'danger',
            emoji: '🗑️',
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, COLLECTIONS.CAPSULES, id));
                    toast.success('Cápsula eliminada 🗑️');
                    setCapsules(prev => prev.filter(c => c.id !== id));
                    setConfirmState(p => ({ ...p, isOpen: false }));
                } catch (err) {
                    toast.error('Error al eliminar');
                }
            }
        });
    };

    const handleUnlockManual = (id) => {
        setConfirmState({
            isOpen: true,
            title: '¿Desbloquear Cápsula?',
            message: 'Se notificará al partner y podrá leer el contenido de inmediato.',
            variant: 'default',
            emoji: '🔑',
            onConfirm: async () => {
                try {
                    await toast.promise(openCapsule({ capsuleId: id }), {
                        loading: 'Desbloqueando...',
                        success: 'Cápsula desbloqueada ✅',
                        error: 'Error al desbloquear'
                    });
                    loadCapsules();
                    setConfirmState(p => ({ ...p, isOpen: false }));
                } catch (err) {
                    console.error('Unlock error:', err);
                }
            }
        });
    };

    return (
        <div className={styles.root}>
            <PageHeader
                title="Cápsulas del Tiempo"
                subtitle={`${capsules.length} cápsulas creadas`}
                actionLabel="Nueva Cápsula"
                actionIcon="✨"
                onAction={() => { setEditingCapsule(null); setShowForm(true); }}
            />

            <ConfirmModal 
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                variant={confirmState.variant}
                emoji={confirmState.emoji}
                onConfirm={confirmState.onConfirm}
                onCancel={() => setConfirmState(p => ({ ...p, isOpen: false }))}
                confirmText="Síp, adelante"
                cancelText="Nop, espera"
            />

            {/* Form panel */}
            {showForm && (
                <Card className={styles.formPanel}>
                    <div className={styles.formPanelHeader}>
                        <h2>{editingCapsule ? '✍️ Editar Cápsula' : '✨ Nueva Cápsula Real'}</h2>
                        <button onClick={() => setShowForm(false)} className={styles.closeBtn} title="Cerrar">✕</button>
                    </div>
                    <CapsuleForm
                        initialData={editingCapsule}
                        onSuccess={handleCreated}
                        onCancel={() => setShowForm(false)}
                    />
                </Card>
            )}

            {/* Capsule grid */}
            {isLoading ? (
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Conectando con el Tiempo...</p>
                </div>
            ) : capsules.length === 0 ? (
                <EmptyState
                    icon="⏳"
                    title="No hay cápsulas enterradas"
                    description="Escribe mensajes para el futuro y prográmalos para que se abran en una fecha especial."
                    action={
                        <Button onClick={() => setShowForm(true)} className={styles.newBtn}>
                            ¡Crear primera real!
                        </Button>
                    }
                />
            ) : (
                <div className={styles.grid}>
                    {capsules.map(capsule => (
                        <CapsuleCard
                            key={capsule.id}
                            capsule={capsule}
                            onEdit={() => { setEditingCapsule(capsule); setShowForm(true); }}
                            onDelete={() => handleDelete(capsule.id)}
                            onUnlock={() => handleUnlockManual(capsule.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function CapsuleCard({ capsule, onEdit, onDelete, onUnlock }) {
    let statusLabel = '🔒 Bloqueada';
    let statusClass = styles.locked;

    if (capsule.isDestructed) {
        statusLabel = '💥 Destruida';
        statusClass = styles.destructed;
    } else if (capsule.isViewed) {
        statusLabel = '👀 Leída';
        statusClass = styles.viewed;
    } else if (capsule.isUnlocked) {
        statusLabel = '✅ Desbloqueada';
        statusClass = styles.unlocked;
    }

    const unlockDateDisplay = capsule.unlockDate
        ? new Date(capsule.unlockDate).toLocaleDateString('es-MX', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        })
        : 'Desbloqueo Manual';

    return (
        <Card className={styles.card}>
            <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{capsule.title}</h3>
                <span className={`${styles.statusBadge} ${statusClass}`}>
                    {statusLabel}
                </span>
            </div>

            <p className={styles.cardDate}>
                <span className={styles.dateIcon}>{capsule.unlockDate ? '⏰' : '🕹️'}</span> {unlockDateDisplay}
            </p>

            <div className={styles.cardBody}>
                {capsule.teaserMessage || <span className={styles.mutedText}>Sin mensaje de teaser...</span>}
            </div>

            <div className={styles.cardFooter}>
                {capsule.autoDestruct && <span className={styles.footerTag} title="Se destruirá tras ser leída">💣 Read-Once</span>}
                {capsule.notifyOnUnlock && <span className={styles.footerTag} title="Enviará Notificación Push">🔔 Notifica</span>}
                {!capsule.autoDestruct && !capsule.notifyOnUnlock && <span className={styles.footerTagMuted}>Estándar</span>}
            </div>

            {/* Hover Actions */}
            <div className={styles.cardActionsOverlay}>
                {!capsule.isUnlocked && !capsule.isDestructed && (
                    <button className={styles.actionBtn} onClick={onUnlock} title="Forzar Desbloqueo">
                        🔑
                    </button>
                )}
                <button className={styles.actionBtn} onClick={onEdit} title="Editar">
                    ✏️
                </button>
                <button 
                    className={`${styles.actionBtn} ${styles.deleteBtn}`} 
                    onClick={onDelete} 
                    title="Eliminar"
                >
                    🗑️
                </button>
            </div>
        </Card>
    );
}
