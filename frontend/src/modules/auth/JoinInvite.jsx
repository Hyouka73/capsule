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
    const [status, setStatus] = useState('procesando'); // 'procesando' | 'manual' | 'exito' | 'error'
    const [errorMsg, setErrorMsg] = useState('');
    const [manualToken, setManualToken] = useState('');

    const processInvite = async (tokenOverride = null) => {
        const params = new URLSearchParams(window.location.search);
        const token = tokenOverride || params.get('t');

        if (!token) {
            setStatus('manual');
            return;
        }

        setStatus('procesando');
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
            const friendlyError = err.message?.includes('ya fue usado')
                ? 'Este código ya fue usado en otro dispositivo. Genera uno nuevo en el panel Admin.'
                : (err.message || 'Ocurrió un error al procesar tu invitación.');
            setErrorMsg(friendlyError);
        }
    };

    useEffect(() => {
        processInvite();
    }, []);

    if (status === 'procesando') {
        return (
            <div className={styles.container}>
                <LoadingScreen message="Procesando invitación mágica..." />
            </div>
        );
    }

    if (status === 'manual') {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <span className={styles.icon}>💌</span>
                    <h2>Casi listos...</h2>
                    <p>Pega tu código de invitación aquí para entrar:</p>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Código de invitación..."
                        value={manualToken}
                        onChange={(e) => setManualToken(e.target.value)}
                    />
                    <button
                        className={styles.btn}
                        onClick={() => processInvite(manualToken)}
                        disabled={!manualToken.trim()}
                    >
                        Unirme a la aventura
                    </button>
                    <p className={styles.helpText}>
                        Pídele a tu pareja que te pase el código desde el panel Admin.
                    </p>
                </div>
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
                <div className={styles.errorActions}>
                    <button className={styles.btn} onClick={() => setStatus('manual')}>
                        Intentar con otro código
                    </button>
                    <button className={styles.btnGhost} onClick={() => window.location.href = '/'}>
                        Volver al inicio
                    </button>
                </div>
            </div>
        </div>
    );
}
