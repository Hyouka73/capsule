import { useState } from 'react';
import { sileo } from 'sileo';
import 'sileo/styles.css';
import { signInAsAdmin } from '../../services/auth';
import styles from './AdminLogin.module.css';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setIsLoading(true);

        const toastOptions = {
            loading: { title: 'Verificando...', description: 'Dame un momento' },
            success: {
                title: '¡Acceso concedido!',
                description: 'Bienvenido a Capsule Admin.',
                styles: {
                    title: 'text-[var(--color-success)]',
                }
            },
            error: {
                title: 'Acceso denegado',
                description: 'Credenciales incorrectas.',
            }
        };

        try {
            await sileo.promise(signInAsAdmin(email, password), toastOptions);
        } catch (err) {
            // Error is already handled by toast.promise
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className={styles.root}>
            {/* Background elements */}
            <div className={`${styles.bgDeco} ${styles.star1} ${styles.floating} ${styles.delay100}`}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '2.25rem' }}>star</span>
            </div>
            <div className={`${styles.bgDeco} ${styles.heart1} ${styles.floating} ${styles.delay500}`}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '1.875rem' }}>favorite</span>
            </div>
            <div className={`${styles.bgDeco} ${styles.heart2} ${styles.floating} ${styles.delay200}`}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '1.5rem' }}>favorite</span>
            </div>
            <div className={`${styles.bgDeco} ${styles.sparkle1} ${styles.floating}`}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <div className={`${styles.bgDeco} ${styles.star2} ${styles.sparkleAnim}`}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>star</span>
            </div>
            <div className={`${styles.bgDeco} ${styles.circle1} ${styles.sparkleAnim} ${styles.delay200}`}>
                <span className="material-symbols-outlined">circle</span>
            </div>

            <main className={styles.mainContainer}>
                <div className={styles.glassCard}></div>

                <div className={styles.headerGroup}>
                    <div className={`${styles.iconWrapper} ${styles.floating}`}>
                        <svg className={styles.mainIcon} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
                        </svg>
                        <div className={styles.iconGlow}></div>
                        <div className={styles.faceDetails}>
                            <div className={styles.eye}></div>
                            <div className={styles.eye}></div>
                        </div>
                        <div className={styles.mouth}></div>
                    </div>

                    <h1 className={styles.title}>¡Bienvenido de vuelta!</h1>
                    <p className={styles.subtitle}>Tu guardián de recuerdos</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Código de Acceso</label>
                        <div className={styles.inputIcon}>
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '24px' }}>lock</span>
                        </div>
                        <input
                            className={styles.input}
                            placeholder="Escribe aquí..."
                            type="email"
                            name="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <div className={styles.inputRightIcon}>
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}>favorite</span>
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Palabra Secreta</label>
                        <div className={styles.inputIcon}>
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '24px' }}>key</span>
                        </div>
                        <input
                            className={styles.input}
                            placeholder="Sssshh..."
                            type={showPassword ? "text" : "password"}
                            name="password"
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ paddingRight: '3rem' }}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className={styles.visibilityBtn}>
                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                                {showPassword ? 'visibility' : 'visibility_off'}
                            </span>
                        </button>
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                        <div className={styles.btnHighlight}></div>
                        <span className={styles.submitBtnText}>
                            {isLoading ? 'Verificando...' : 'Abrir Recuerdos'}
                        </span>
                        {!isLoading && (
                            <span className={`material-symbols-outlined ${styles.arrowIcon}`}>arrow_forward_ios</span>
                        )}
                    </button>
                </form>

                <div className={styles.avatarBtnContainer}>
                    <button className={styles.avatarBtn} type="button">
                        <span className="material-symbols-outlined" style={{ fontSize: '2.25rem' }}>face_3</span>
                    </button>
                </div>

                <div className={styles.footerNote}>
                    <div className={styles.footerPill}>
                        <p className={styles.footerText}>
                            <span className={`material-symbols-outlined ${styles.footerIcon}`} style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                            Cada recuerdo es un regalo
                            <span className={`material-symbols-outlined ${styles.footerIcon}`} style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
