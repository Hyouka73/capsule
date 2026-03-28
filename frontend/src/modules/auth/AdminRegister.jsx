import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/ui/PastelToast/PastelToast';
import PastelInput from '../../components/ui/PastelInput/PastelInput';
import PastelButton from '../../components/ui/PastelButton/PastelButton';
import PastelCard from '../../components/ui/PastelCard/PastelCard';
import styles from './AdminRegister.module.css';

/**
 * AdminRegister
 *
 * Admin registration screen. Creates a new Admin account.
 * Route: /admin/register
 */
export default function AdminRegister() {
    const navigate = useNavigate();
    const { registerAdmin } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();

        if (password.length < 8) {
            toast.error('Contraseña muy corta', 'La contraseña debe tener al menos 8 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Contraseñas no coinciden', 'Verifica que ambas sean iguales.');
            return;
        }

        setIsLoading(true);
        try {
            await toast.promise(registerAdmin(email, password), {
                loading: { title: 'Creando tu espacio...', description: 'Preparando la relación 💕' },
                success: { title: '¡Listo!', description: 'Tu cuenta está preparada. Ahora invita a tu pareja.' },
                error: (err) => ({
                    title: 'Error al registrar',
                    description: err.code === 'auth/email-already-in-use'
                        ? 'Este correo ya tiene una cuenta.'
                        : (err.message || 'Ocurrió un error inesperado.'),
                }),
            });
            navigate('/admin', { replace: true });
        } catch {
            // Handled by toast.promise
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className={styles.root}>
            {/* Decorative background elements */}
            <div className={`${styles.bgDeco} ${styles.deco1}`}>💕</div>
            <div className={`${styles.bgDeco} ${styles.deco2}`}>✨</div>
            <div className={`${styles.bgDeco} ${styles.deco3}`}>🌸</div>

            <main className={styles.mainContainer}>
                <PastelCard
                    className={styles.card}
                    animate={{ opacity: 1, y: 0 }}
                    initial={{ opacity: 0, y: 32 }}
                >
                    <div className={styles.headerGroup}>
                        <motion.div
                            className={styles.iconWrapper}
                            animate={{ y: [0, -6, 0] }}
                            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                        >
                            <span className={styles.mainIcon}>💝</span>
                        </motion.div>
                        <h1 className={styles.title}>Crear tu espacio</h1>
                        <p className={styles.subtitle}>
                            Sé el guardián de sus recuerdos
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <PastelInput
                            label="Tu Correo"
                            icon="mail"
                            placeholder="tu@correo.com"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <PastelInput
                            label="Contraseña Secreta"
                            icon="lock"
                            placeholder="Mínimo 8 caracteres..."
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <PastelInput
                            label="Confirmar Contraseña"
                            icon="key"
                            placeholder="Repite tu contraseña..."
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />

                        <PastelButton
                            type="submit"
                            fullWidth
                            isLoading={isLoading}
                            className={styles.submitBtn}
                        >
                            {isLoading ? 'Creando tu espacio...' : 'Crear mi espacio 💕'}
                        </PastelButton>
                    </form>

                    <div className={styles.loginLink}>
                        <span className={styles.loginLinkText}>¿Ya tienes cuenta?</span>
                        <button
                            type="button"
                            className={styles.loginLinkBtn}
                            onClick={() => navigate('/admin/login')}
                        >
                            Iniciar sesión
                        </button>
                    </div>
                </PastelCard>
            </main>
        </div>
    );
}
