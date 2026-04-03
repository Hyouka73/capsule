import { useState, useEffect } from 'react';
import { COLLECTIONS } from '../../config/constants';
import { getCapsules, openCapsule, deleteCapsule } from '../../apiClient';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
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
    const [activeFilter, setActiveFilter] = useState('manual'); // 'manual' | 'scheduled' | 'delivered' | 'opened'

    // Confirm Modal State
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        variant: 'default',
        emoji: '👋'
    });

    const { relationshipId } = useAuth();

    useEffect(() => {
        if (!relationshipId) return;

        setIsLoading(true);
        const capsRef = collection(db, 'relationships', relationshipId, COLLECTIONS.CAPSULES);
        const q = query(capsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const caps = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Normalización de fechas de Firestore a JS Date para la UI
                unlockDate: doc.data().unlockDate?.toDate() || doc.data().unlockAt?.toDate() || null,
                createdAt: doc.data().createdAt?.toDate() || null,
            }));
            setCapsules(caps);
            setIsLoading(false);
        }, (err) => {
            console.error('[CapsuleManager] Snapshot error:', err);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [relationshipId]);

    const filteredCapsules = capsules.filter(c => {
        const now = Date.now();
        const opensAt = c.unlockDate ? new Date(c.unlockDate).getTime() : null;
        
        // "Efectivamente Desbloqueada": Combinamos el flag del servidor con el tiempo real del cliente
        const effectivelyUnlocked = c.isUnlocked || (c.unlockTrigger === 'date' && opensAt && opensAt <= now);

        if (activeFilter === 'manual') {
            return c.unlockTrigger === 'manual' && !effectivelyUnlocked;
        }
        
        if (activeFilter === 'scheduled') {
            return c.unlockTrigger === 'date' && !effectivelyUnlocked;
        }
        
        if (activeFilter === 'delivered') {
            return effectivelyUnlocked && !c.isViewed;
        }
        
        if (activeFilter === 'opened') {
            return c.isViewed;
        }
        
        return false; // Blindaje: No mostrar cápsulas huérfanas
    });

    const handleCreated = (savedData) => {
        setShowForm(false);
        setEditingCapsule(null);
        
        // Navegación inteligente a la pestaña correcta
        if (savedData) {
            if (savedData.unlockTrigger === 'date') {
                const now = Date.now();
                const unlockMs = new Date(savedData.unlockDate).getTime();
                if (unlockMs > now) {
                    setActiveFilter('scheduled');
                } else {
                    setActiveFilter('delivered');
                }
            } else {
                setActiveFilter('manual');
            }
        }
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
                    await deleteCapsule({ capsuleId: id });
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
                    // onSnapshot manejará la actualización de la lista automáticamente
                    setConfirmState(p => ({ ...p, isOpen: false }));
                } catch (err) {
                    // silent fail
                }
            }
        });
    };
    // Render separated Form View
    if (showForm) {
        return (
            <div className={styles.editorView}>
                <div className={styles.editorHeader}>
                    <button className={styles.backBtnHeader} onClick={() => { setShowForm(false); setEditingCapsule(null); }}>
                        <span className="material-symbols-rounded">arrow_back</span>
                    </button>
                    <div className={styles.editorTitles}>
                        <h2>{editingCapsule ? 'Editando Cápsula ⏳' : 'Nueva Cápsula ✨'}</h2>
                        <p>Asegúrate de que el mensaje llegue intacto al futuro</p>
                    </div>
                </div>

                <div className={styles.editorCard}>
                    <CapsuleForm
                        initialData={editingCapsule}
                        onSuccess={handleCreated}
                    />
                </div>
            </div>
        );
    }

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

            {/* Filtros */}
            <div className={styles.filterTabs}>
                <button 
                    className={`${styles.filterTab} ${activeFilter === 'manual' ? styles.filterTabActive : ''}`}
                    onClick={() => setActiveFilter('manual')}
                >
                    📂 Manuales
                </button>
                <button 
                    className={`${styles.filterTab} ${activeFilter === 'scheduled' ? styles.filterTabActive : ''}`}
                    onClick={() => setActiveFilter('scheduled')}
                >
                    ⏳ Programadas
                </button>
                <button 
                    className={`${styles.filterTab} ${activeFilter === 'delivered' ? styles.filterTabActive : ''}`}
                    onClick={() => setActiveFilter('delivered')}
                >
                    ✨ Listas
                </button>
                <button 
                    className={`${styles.filterTab} ${activeFilter === 'opened' ? styles.filterTabActive : ''}`}
                    onClick={() => setActiveFilter('opened')}
                >
                    📖 Abiertas
                </button>
            </div>

            {/* Capsule grid */}
            {isLoading ? (
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Conectando con el Tiempo...</p>
                </div>
            ) : filteredCapsules.length === 0 ? (
                <EmptyState
                    icon="⏳"
                    title="No hay cápsulas en esta categoría"
                    description="Aquí aparecerán las cápsulas según su estado de desbloqueo y lectura."
                />
            ) : (
                <div className={styles.grid}>
                    {filteredCapsules.map(capsule => (
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
        statusLabel = '✨ Lista para abrir';
        statusClass = styles.unlocked;
    } else if (capsule.unlockTrigger === 'date') {
        statusLabel = '⏳ Programada';
        statusClass = styles.locked;
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
                {capsule.hasAttachments && capsule.files?.length > 0 && (
                    <span className={styles.footerTag} title={`${capsule.files.length} archivo(s) adjunto(s)`}>
                        {(() => {
                            const types = capsule.files.map(f => {
                                const mime = f.mimeType || f.fileName || '';
                                if (mime.includes('image') || /\.(jpg|jpeg|png|webp|gif)$/i.test(mime)) return 'image';
                                if (mime.includes('video') || /\.(mp4|mov|webm)$/i.test(mime)) return 'video';
                                return 'file';
                            });
                            const hasImages = types.includes('image');
                            const hasVideos = types.includes('video');
                            const hasOther = types.includes('file');
                            const icons = [];
                            if (hasImages) icons.push('📷');
                            if (hasVideos) icons.push('🎬');
                            if (hasOther) icons.push('📎');
                            return `${icons.join('')} ${capsule.files.length} adjunto${capsule.files.length > 1 ? 's' : ''}`;
                        })()}
                    </span>
                )}
                {capsule.autoDestroy && <span className={styles.footerTag} title="Se destruirá tras ser leída">💣 Read-Once</span>}
                {capsule.notifyOnUnlock && <span className={styles.footerTag} title="Enviará Notificación Push">🔔 Notifica</span>}
                {!capsule.autoDestroy && !capsule.notifyOnUnlock && !capsule.hasAttachments && <span className={styles.footerTagMuted}>Estándar</span>}
            </div>

            {/* Hover Actions */}
            <div className={styles.cardActionsOverlay}>
                {!capsule.isUnlocked && !capsule.isDestructed && (
                    <button className={styles.actionBtn} onClick={onUnlock} title="Forzar Desbloqueo">
                        🔑
                    </button>
                )}
                {/* Solo permitir editar si NO está desbloqueada */}
                {!capsule.isUnlocked && (
                    <button className={styles.actionBtn} onClick={onEdit} title="Editar">
                        ✏️
                    </button>
                )}
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
