import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { callValidateInviteToken } from '../../services/auth';
import LoadingScreen from '../../components/ui/LoadingScreen/LoadingScreen';
import PastelInput from '../../components/ui/PastelInput/PastelInput';
import PastelButton from '../../components/ui/PastelButton/PastelButton';
import PastelCard from '../../components/ui/PastelCard/PastelCard';
import { toast } from '../../components/ui/PastelToast/PastelToast';
import styles from './JoinInvite.module.css';
import { generateUUID } from '../../utils/uuid';

export default function JoinInvite() {
    const navigate = useNavigate();
    const { exchangeToken } = useAuth();
    const [searchParams] = useSearchParams();

    const [phase, setPhase] = useState('loading'); // 'loading' | 'valid' | 'claiming' | 'manual-token' | 'success' | 'error'
    const [token, setToken] = useState(searchParams.get('t') || '');
    const [errorMsg, setErrorMsg] = useState('');

    const validateToken = useCallback(async (tokenToVerify) => {
        if (!tokenToVerify) {
            setPhase('manual-token');
            return;
        }

        setPhase('loading');
        try {
            const result = await callValidateInviteToken(tokenToVerify);
            if (result.valid) {
                setToken(tokenToVerify);
                setPhase('valid');
            } else {
                throw new Error(result.message || 'El link de invitación no es válido.');
            }
        } catch (err) {
            setPhase('error');
            setErrorMsg(err.message || 'Error al validar el link.');
        }
    }, []);

    const handleAutoJoin = useCallback(async (tokenToUse) => {
        setPhase('claiming');
        setErrorMsg('');
        
        try {
            let fingerprint = localStorage.getItem('capsule_device_id');
            if (!fingerprint) {
                fingerprint = generateUUID();
                localStorage.setItem('capsule_device_id', fingerprint);
            }

            await exchangeToken(tokenToUse, fingerprint);
            
            setPhase('success');
            toast.success('¡Espacio activado! 💜');
            setTimeout(() => navigate('/', { replace: true }), 1500);
        } catch (err) {
            console.error('[JoinInvite] AutoJoin error:', err);
            setErrorMsg(err.message || 'Error al activar tu cuenta. El link podría haber expirado.');
            setPhase('error');
        }
    }, [exchangeToken, navigate]);

    // 1. Validate Token on mount
    useEffect(() => {
        const t = searchParams.get('t');
        if (t && phase === 'loading') {
            validateToken(t);
        } else if (!t && phase === 'loading') {
            setPhase('manual-token');
        }
    }, [searchParams, phase, validateToken]);

    // 2. Automate Claiming when token is valid
    useEffect(() => {
        if (phase === 'valid' && token) {
            handleAutoJoin(token);
        }
    }, [phase, token, handleAutoJoin]);

    if (phase === 'loading' || phase === 'claiming') {
        return (
            <div className={styles.container}>
                <LoadingScreen message={phase === 'loading' ? 'Revisando tu invitación... 📩' : 'Activando nuestro espacio... ✨'} />
            </div>
        );
    }

    if (phase === 'manual-token') {
        return (
            <div className={styles.container}>
                <PastelCard className={styles.card}>
                    <span className={styles.icon}>💌</span>
                    <h2 className={styles.cardTitle}>Entrar con invitación</h2>
                    <p className={styles.cardDesc}>Pega el código que te envió tu pareja:</p>
                    <PastelInput
                        placeholder="Código de invitación..."
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                    />
                    <PastelButton
                        fullWidth
                        disabled={!token.trim()}
                        onClick={() => validateToken(token.trim())}
                    >
                        Verificar Código ✨
                    </PastelButton>
                </PastelCard>
            </div>
        );
    }

    if (phase === 'success') {
        return (
            <div className={styles.container}>
                <PastelCard className={styles.card}>
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                        <span className={styles.icon}>✨</span>
                        <h2 className={styles.cardTitle}>¡Listo!</h2>
                        <p className={styles.cardDesc}>Bienvenida a bordo...</p>
                    </motion.div>
                </PastelCard>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <PastelCard className={styles.card} color="rose">
                <span className={styles.icon}>❌</span>
                <h2 className={styles.cardTitle}>Algo salió mal</h2>
                <p className={styles.errorText}>{errorMsg || 'Token inválido o expirado.'}</p>
                <PastelButton
                    variant="secondary"
                    fullWidth
                    onClick={() => setPhase('manual-token')}
                >
                    Intentar con otro código
                </PastelButton>
            </PastelCard>
        </div>
    );
}
