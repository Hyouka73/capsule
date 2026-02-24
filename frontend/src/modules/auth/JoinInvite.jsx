import { useEffect, useState } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../../services/firebase';
import {
    exchangeInviteToken,
    generateDeviceFingerprint
} from '../../services/auth';
import LoadingScreen from '../../components/ui/LoadingScreen/LoadingScreen';
import styles from './JoinInvite.module.css';

/**
 * JoinInvite — Partner onboarding flow
 * 
 * 1. Capture 't' from URL query
 * 2. Generate device fingerprint
 * 3. Call Cloud Function to exchange token
 * 4. Sign in with Custom Token
 * 5. Redirect to /app
 */
export default function JoinInvite() {
    const [status, setStatus] = useState('procesando'); // 'procesando' | 'exito' | 'error'
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const processInvite = async () => {
            const params = new URLSearchParams(window.location.search);
            const token = params.get('t');

            if (!token) {
                setStatus('error');
                setErrorMsg('No se encontró un token de invitación válido.');
                return;
            }

            try {
                // 1. Ensure a device fingerprint exists
                const fingerprint = generateDeviceFingerprint();

                // 2. Exchange token via Cloud Function
                const { customToken } = await exchangeInviteToken(token, fingerprint);

                // 3. Sign in to Firebase
                await signInWithCustomToken(auth, customToken);

                // 4. Success! Redirect to /app
                setStatus('exito');
                setTimeout(() => {
                    window.location.href = '/app';
                }, 1500);

            } catch (err) {
                console.error('[JoinInvite] Error:', err);
                setStatus('error');
                setErrorMsg(err.message || 'Ocurrió un error al procesar tu invitación.');
            }
        };

        processInvite();
    }, []);

    if (status === 'procesando') {
        return (
            <div className={styles.container}>
                <LoadingScreen message="Procesando invitación mágica..." />
            </div>
        );
    }

    if (status === 'exito') {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <span className={styles.icon}>✨</span>
                    <h2>¡Invitación aceptada!</h2>
                    <p>Preparando tu cápsula del tiempo...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <span className={styles.iconError}>❌</span>
                <h2>Ups, algo salió mal</h2>
                <p className={styles.errorText}>{errorMsg}</p>
                <button className={styles.btn} onClick={() => window.location.href = '/'}>
                    Volver al inicio
                </button>
            </div>
        </div>
    );
}
