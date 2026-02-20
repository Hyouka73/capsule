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

    useEffect(() => {
        loadCapsules();
    }, []);

    async function loadCapsules() {
        setIsLoading(true);
        try {
            const result = await getCapsules();
            // Las cápsulas con isDestructed=true generalmente no se mandan al partner, pero el admin las ve
            setCapsules(result.capsules || []);
        } catch (err) {
            console.error('Error loading capsules:', err);
        } finally {
            setIsLoading(false);
        }
    }

    const handleCreated = () => {
        setShowForm(false);
        loadCapsules();
    };

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Cápsulas del Tiempo</h1>
                    <p className={styles.subtitle}>{capsules.length} cápsulas programadas</p>
                </div>
                <Button
                    onClick={() => setShowForm(true)}
                    icon="+"
                >
                    Nueva Cápsula
                </Button>
            </div>

            {/* Form panel */}
            {showForm && (
                <Card className={styles.formPanel} glass>
                    <div className={styles.formPanelHeader}>
                        <h2>Nueva Cápsula Sorpresa</h2>
                        <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className={styles.closeBtn}>✕</Button>
                    </div>
                    <CapsuleForm
                        onSuccess={handleCreated}
                        onCancel={() => setShowForm(false)}
                    />
                </Card>
            )}

            {/* Capsule grid */}
            {isLoading ? (
                <div className={styles.loading}>Cargando...</div>
            ) : capsules.length === 0 ? (
                <div className={styles.empty}>
                    <p className={styles.emptyIcon}>⏳</p>
                    <p>No has enterrado ninguna cápsula del tiempo.</p>
                    <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
                        ¡Crea la primera sorpresa!
                    </Button>
                </div>
            ) : (
                <div className={styles.grid}>
                    {capsules.map(capsule => (
                        <CapsuleCard
                            key={capsule.id}
                            capsule={capsule}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function CapsuleCard({ capsule }) {
    let statusLabel = 'Bloqueada';
    let statusClass = styles.locked;

    if (capsule.isDestructed) {
        statusLabel = 'Destruida';
        statusClass = styles.viewed;
    } else if (capsule.isViewed) {
        statusLabel = 'Leída';
        statusClass = styles.viewed;
    } else if (capsule.isUnlocked) {
        statusLabel = 'Desbloqueada';
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
                ⏳ {unlockDate}
            </p>

            <div className={styles.cardBody}>
                {capsule.teaserMessage}
            </div>

            <div className={styles.cardFooter}>
                {capsule.autoDestruct && <span title="Se destruirá tras ser leída">💣 Read-Once</span>}
                {capsule.notifyOnUnlock && <span title="Enviará Notificación Push">🔔 Notifica</span>}
            </div>
        </Card>
    );
}
