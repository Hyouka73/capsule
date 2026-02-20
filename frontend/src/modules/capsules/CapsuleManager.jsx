import { useState, useEffect } from 'react';
import { getCapsules } from '../../apiClient';
import CapsuleForm from './CapsuleForm';
import Button from '../../components/ui/Button/Button';
import Card from '../../components/ui/Card/Card';
import styles from './CapsuleManager.module.css';

export default function CapsuleManager() {
    const [capsules, setCapsules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCapsule, setEditingCapsule] = useState(null);

    useEffect(() => {
        loadCapsules();
    }, []);

    async function loadCapsules() {
        setIsLoading(true);
        try {
            const result = await getCapsules();
            setCapsules(result.capsules || []);
        } catch (err) {
            console.error('Error loading capsules:', err);
        } finally {
            setIsLoading(false);
        }
    }

    const handleCreated = () => {
        setShowForm(false);
        setEditingCapsule(null);
        loadCapsules();
    };

    // Mock Actions
    const handleDelete = (id) => {
        if (confirm('¿Seguro que quieres eliminar esta cápsula? (UI mock)')) {
            setCapsules(prev => prev.filter(c => c.id !== id));
        }
    };

    const handleUnlockManual = (id) => {
        if (confirm('¿Desbloquear esta cápsula ahora mismo?')) {
            setCapsules(prev => prev.map(c => c.id === id ? { ...c, isUnlocked: true, unlockDate: new Date().toISOString() } : c));
        }
    };

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Cápsulas del Tiempo</h1>
                    <p className={styles.subtitle}>{capsules.length} cápsulas creadas</p>
                </div>
                <Button
                    onClick={() => { setEditingCapsule(null); setShowForm(true); }}
                    className={styles.newBtn}
                >
                    <span className={styles.btnIcon}>✨</span> Nueva Cápsula
                </Button>
            </div>

            {/* Form panel */}
            {showForm && (
                <Card className={styles.formPanel} glass>
                    <div className={styles.formPanelHeader}>
                        <h2>{editingCapsule ? '✍️ Editar Cápsula' : '✨ Nueva Cápsula Sorpresa'}</h2>
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
                    <p>Buscando cápsulas...</p>
                </div>
            ) : capsules.length === 0 ? (
                <div className={styles.empty}>
                    <div className={styles.emptyIllustration}>⏳</div>
                    <h3>No has enterrado ninguna cápsula</h3>
                    <p>Escribe mensajes para el futuro y prográmalos para que se abran en una fecha especial.</p>
                    <Button onClick={() => setShowForm(true)} className={styles.newBtn}>
                        ¡Crea la primera!
                    </Button>
                </div>
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

    const unlockDate = capsule.unlockDate
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
                <span className={styles.dateIcon}>{capsule.unlockDate ? '⏰' : '🕹️'}</span> {unlockDate}
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
                <button className={styles.actionBtn} onClick={() => alert('Mock: Cápsula clonada')} title="Clonar">
                    📑
                </button>
                <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={onDelete} title="Eliminar">
                    🗑️
                </button>
            </div>
        </Card>
    );
}
