import { useState } from 'react';
import PastelCard from '../../components/ui/PastelCard/PastelCard';
import PastelButton from '../../components/ui/PastelButton/PastelButton';
import SnapshotHistory from './components/SnapshotHistory';
import SnapshotCreator from './components/SnapshotCreator';
import styles from './SnapshotManager.module.css';

/**
 * SnapshotManager — Admin interface for Snapshots (Instantáneas)
 * 
 * Allows Admin to:
 * - Create new snapshots (opens camera).
 * - View snapshot history.
 * - Manage active snapshots.
 */
export default function SnapshotManager() {
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <h1 className={styles.title}>📸 Gestión de Instantáneas</h1>
                <p className={styles.subtitle}>Captura momentos efímeros que duran 24 horas.</p>
            </div>

            <div className={styles.grid}>
                <PastelCard className={styles.controlCard} color="rose">
                    <div className={styles.cardIcon}>✨</div>
                    <h3>Nueva Instantánea</h3>
                    <p>Captura algo ahora mismo para sorprender a tu pareja.</p>
                    <PastelButton 
                        fullWidth 
                        onClick={() => setIsCameraOpen(true)}
                        className={styles.actionBtn}
                    >
                        Abrir Cámara 📸
                    </PastelButton>
                </PastelCard>

                <PastelCard className={styles.controlCard} color="cyan">
                    <div className={styles.cardIcon}>📜</div>
                    <h3>Historial</h3>
                    <p>Revisa todas las instantáneas enviadas anteriormente.</p>
                    <PastelButton 
                        fullWidth 
                        variant="secondary"
                        onClick={() => setIsHistoryOpen(true)}
                        className={styles.actionBtn}
                    >
                        Ver Pasado 🕰️
                    </PastelButton>
                </PastelCard>
            </div>

            {/* Overlays / Modals */}
            {isCameraOpen && (
                <SnapshotCreator 
                    onClose={() => setIsCameraOpen(false)} 
                />
            )}

            {isHistoryOpen && (
                <div className={styles.historyModal}>
                    <PastelCard className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>Historial de Instantáneas</h2>
                            <button className={styles.closeBtn} onClick={() => setIsHistoryOpen(false)}>✕</button>
                        </div>
                        <SnapshotHistory />
                    </PastelCard>
                </div>
            )}
        </div>
    );
}
