import KawaiiInput from '../../../components/ui/KawaiiInput/KawaiiInput';
import styles from '../GlobalSettings.module.css';

export default function ToggleRow({ 
    label, 
    desc, 
    checked, 
    onChange, 
    isModule = false, 
    onboardingStatus = null, 
    onOnboardingChange = null 
}) {
    return (
        <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
                <div className={styles.toggleTitleWrapper}>
                    <span className={styles.toggleLabel}>{label}</span>
                    {isModule && !checked && (
                        <span className={styles.moduleDisabledBadge}>
                            Inactivo
                        </span>
                    )}
                </div>
                <span className={styles.toggleDesc}>{desc}</span>
            </div>
            
            {onboardingStatus !== null && (
                <div className={styles.onboardingToggleArea}>
                    <span className={styles.onboardingLabel}>Ayuda Interactiva</span>
                    <KawaiiInput 
                        type="toggle" 
                        value={onboardingStatus} 
                        onChange={onOnboardingChange} 
                    />
                </div>
            )}

            <div className={styles.mainToggleArea}>
                <KawaiiInput type="toggle" value={checked} onChange={onChange} />
            </div>
        </div>
    );
}
