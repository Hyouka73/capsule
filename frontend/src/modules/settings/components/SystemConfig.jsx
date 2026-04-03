import { motion } from 'framer-motion';
import Card from '../../../components/ui/Card/Card';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from '../../../components/ui/PastelToast/PastelToast';
import ToggleRow from './ToggleRow';
import styles from '../GlobalSettings.module.css';

export default function SystemConfig({ config, handleUpdate }) {
    const { role } = useAuth();
    const isAdmin = role === 'admin';

    const safeUpdate = (path, value) => {
        if (!isAdmin) {
            toast.error('Acceso Denegado', 'Solo el Administrador puede modificar los módulos del sistema.');
            return;
        }
        handleUpdate(path, value);
    };

    return (
        <Card className={styles.sectionCard} glass>
            <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>🧩</span>
                <h3>Módulos del Sistema</h3>
            </div>
            <p className={styles.sectionDesc}>Habilita o deshabilita secciones principales. (Solo Admin)</p>

            <div className={styles.togglesList}>
                <ToggleRow
                    label="Mapa"
                    desc="Visualización geográfica de vuestras citas."
                    checked={config.modules.snapshots.isEnabled}
                    onChange={() => {
                        const newValue = !config.modules.snapshots.isEnabled;
                        safeUpdate('modules.snapshots.isEnabled', newValue);
                        safeUpdate('features.memoryMap', newValue);
                    }}
                    onboardingStatus={config.modules.snapshots.onboardingEnabled}
                    onOnboardingChange={() => safeUpdate('modules.snapshots.onboardingEnabled', !config.modules.snapshots.onboardingEnabled)}
                    isModule
                />
                <ToggleRow
                    label="Galería"
                    desc="Acceso directo a todo el contenido multimedia."
                    checked={config.features.photoGallery}
                    onChange={() => safeUpdate('features.photoGallery', !config.features.photoGallery)}
                />
                <ToggleRow
                    label="Cápsulas"
                    desc="Línea temporal de momentos programados."
                    checked={config.modules.capsules.isEnabled}
                    onChange={() => {
                        const newValue = !config.modules.capsules.isEnabled;
                        safeUpdate('modules.capsules.isEnabled', newValue);
                        safeUpdate('features.timeCapsules', newValue);
                    }}
                    onboardingStatus={config.modules.capsules.onboardingEnabled}
                    onOnboardingChange={() => safeUpdate('modules.capsules.onboardingEnabled', !config.modules.capsules.onboardingEnabled)}
                    isModule
                />
                <ToggleRow
                    label="Cupones"
                    desc="Favores canjeables y regalos digitales."
                    checked={config.modules.coupons.isEnabled}
                    onChange={() => {
                        const newValue = !config.modules.coupons.isEnabled;
                        safeUpdate('modules.coupons.isEnabled', newValue);
                        safeUpdate('features.coupons', newValue);
                    }}
                    onboardingStatus={config.modules.coupons.onboardingEnabled}
                    onOnboardingChange={() => safeUpdate('modules.coupons.onboardingEnabled', !config.modules.coupons.onboardingEnabled)}
                    isModule
                />
                <ToggleRow
                    label="Bingo"
                    desc="Juego interactivo de misiones en pareja."
                    checked={config.modules.bingo.isEnabled}
                    onChange={() => {
                        const newValue = !config.modules.bingo.isEnabled;
                        safeUpdate('modules.bingo.isEnabled', newValue);
                        safeUpdate('features.bingoBoard', newValue);
                    }}
                    onboardingStatus={config.modules.bingo.onboardingEnabled}
                    onOnboardingChange={() => safeUpdate('modules.bingo.onboardingEnabled', !config.modules.bingo.onboardingEnabled)}
                    isModule
                />
            </div>

            <div className={styles.divider}></div>
            
            <div className={styles.togglesList}>
                <ToggleRow
                    label="Ejercicio"
                    desc="Seguimiento de actividad y rachas físicas."
                    checked={config.features.exercise}
                    onChange={() => safeUpdate('features.exercise', !config.features.exercise)}
                />
                <ToggleRow
                    label="Películas"
                    desc="Lista de películas para ver y comentar."
                    checked={config.modules.movies.isEnabled}
                    onChange={() => {
                        const newValue = !config.modules.movies.isEnabled;
                        safeUpdate('modules.movies.isEnabled', newValue);
                        safeUpdate('features.movieTracking', newValue);
                    }}
                    onboardingStatus={config.modules.movies.onboardingEnabled}
                    onOnboardingChange={() => safeUpdate('modules.movies.onboardingEnabled', !config.modules.movies.onboardingEnabled)}
                    isModule
                />
                <ToggleRow
                    label="Juegos"
                    desc="Minijuegos y dinámicas interactivas."
                    checked={config.features.games}
                    onChange={() => safeUpdate('features.games', !config.features.games)}
                />
                <ToggleRow
                    label="Huevos de Pascua"
                    desc="Animaciones y sorpresas ocultas en la UI."
                    checked={config.features.easterEggs}
                    onChange={() => safeUpdate('features.easterEggs', !config.features.easterEggs)}
                />
                <ToggleRow
                    label="Onboarding"
                    desc="Guía interactiva para nuevos usuarios."
                    checked={config.features.onboarding}
                    onChange={() => safeUpdate('features.onboarding', !config.features.onboarding)}
                />
            </div>
        </Card>
    );
}
