import { useAuth } from '../../../hooks/useAuth';
import { useSnapshots } from '../hooks/useSnapshots';
import styles from './SnapshotButton.module.css';
import TulipIcon from '../../../components/ui/TulipIcon';

/**
 * SnapshotButton — El disparador de momentos espontáneos.
 * 
 * Flujo de uso:
 * 1. Si hay fotos sin ver: Al pulsar, abre el Overlay (el mazo).
 * 2. Si NO hay fotos sin ver: Al pulsar, abre la Cámara directamente.
 * 3. Al terminar de ver el mazo, se abrirá la cámara automáticamente (vía prop onOpenHistory).
 */
export default function SnapshotButton({ onOpenSnapshot, onOpenCamera, onOpenHistory }) {
    const { user, relationshipId } = useAuth();
    const { unseenSnapshots, hasUnseen, loading } = useSnapshots();

    if (!user || !relationshipId || loading) return null;

    const handleClick = () => {
        if (hasUnseen) {
            // Pasar la lista al overlay. Al terminar el overlay, Dashboard abrirá la cámara.
            onOpenSnapshot(unseenSnapshots);
        } else {
            // Abrir cámara directamente
            onOpenCamera();
        }
    };

    return (
        <div className={styles.container}>
            <button
                className={`${styles.instantaneasBtn} ${hasUnseen ? styles.hasNew : styles.discrete}`}
                onClick={handleClick}
                title={hasUnseen ? `✨ ${unseenSnapshots.length} momentos nuevos para ti` : 'Enviar un momento espontáneo 📸'}
            >
                <div className={styles.iconWrapper}>
                    <TulipIcon size={26} color={hasUnseen ? 'white' : undefined} />
                </div>
                {hasUnseen && <div className={styles.badge}>{unseenSnapshots.length}</div>}
                {hasUnseen && <div className={styles.glowContainer} />}
            </button>
        </div>
    );
}
