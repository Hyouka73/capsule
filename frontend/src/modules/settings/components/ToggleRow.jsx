import KawaiiInput from '../../../components/ui/KawaiiInput/KawaiiInput';
import styles from '../GlobalSettings.module.css';

export default function ToggleRow({ label, desc, checked, onChange, isModule = false }) {
    return (
        <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
                <div className={styles.toggleTitleWrapper}>
                    <span className={styles.toggleLabel}>{label}</span>
                    {isModule && !checked && (
                        <span className={styles.moduleDisabledBadge}>
                            Módulo desactivado
                        </span>
                    )}
                </div>
                <span className={styles.toggleDesc}>{desc}</span>
            </div>
            <KawaiiInput type="toggle" value={checked} onChange={onChange} />
        </div>
    );
}
