import { useEffect, useState } from 'react';
import { useCameraPermissions } from '../../../hooks/useCameraPermissions';
import { logToVercel } from '../../../utils/vercelLogger';
import styles from './CameraPermissionGate.module.css';

/**
 * CameraPermissionGate - A wrapper component that ensures camera permissions
 * are granted before showing its children.
 * 
 * If permissions are not granted, it shows a UI to request them.
 */
export default function CameraPermissionGate({ children, onCancel }) {
    const { status, isRequesting, checkPermission, requestPermission } = useCameraPermissions();
    const [hasAttempted, setHasAttempted] = useState(false);

    useEffect(() => {
        checkPermission();
    }, [checkPermission]);

    const handleRequest = async () => {
        setHasAttempted(true);
        const granted = await requestPermission();
        if (granted) {
            logToVercel('CameraPermissionGate', 'GRANTED', 'User allowed camera');
        } else {
            logToVercel('CameraPermissionGate', 'DENIED', 'User denied camera');
        }
    };

    // While checking, render nothing to avoid flash
    if (status === 'unknown') {
        return null;
    }

    // If already granted, just show children
    if (status === 'granted') {
        return children;
    }

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.iconContainer}>
                    <span className="material-symbols-rounded" style={{ fontSize: '48px', color: '#3182ce' }}>
                        photo_camera_front
                    </span>
                </div>

                <h2 className={styles.title}>Activa tu Cámara</h2>
                <p className={styles.description}>
                    Para guardar tus recuerdos en Capsule, necesitamos tu permiso para abrir la cámara.
                    Al presionar el botón, verás el recuadro de Chrome: selecciona <b>Permitir</b>.
                </p>

                <div className={styles.actions}>
                    <button
                        className={styles.primaryBtn}
                        onClick={handleRequest}
                        disabled={isRequesting}
                    >
                        {isRequesting ? 'Activando...' : 'Habilitar Cámara'}
                    </button>

                    <button
                        className={styles.secondaryBtn}
                        onClick={onCancel}
                        disabled={isRequesting}
                    >
                        Ahora no
                    </button>
                </div>

                {status === 'denied' && hasAttempted && (
                    <p className={styles.errorText}>
                        Parece que la cámara está bloqueada. <br />
                        Toca el candado junto a la dirección (URL) y activa el permiso manualmente.
                    </p>
                )}
            </div>
        </div>
    );
}
