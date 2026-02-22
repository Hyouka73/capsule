import { useState } from 'react';
import Card from '../../components/ui/Card/Card';
import Button from '../../components/ui/Button/Button';
import KawaiiInput from '../../components/ui/KawaiiInput/KawaiiInput';
import styles from './WrappedManager.module.css';

export default function WrappedManager() {
    const [isWrappedEnabled, setIsWrappedEnabled] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const pastWrappeds = [
        { year: 2025, title: 'Un año de sonrisas', date: '2025-12-30T10:00:00Z', isReady: true },
        { year: 2024, title: 'Inicios mágicos', date: '2024-12-28T14:30:00Z', isReady: true },
    ];

    const handleGenerate = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            alert('¡Wrapped 2026 generado con éxito!');
        }, 1500);
    };

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Panel de Wrapped</h1>
                    <p className={styles.subtitle}>Genera resúmenes musicales y emocionales del año.</p>
                </div>
            </div>

            <div className={styles.dashboard}>
                {/* Current Year Wrapped Control */}
                <Card className={styles.currentYearCard} glass>
                    <div className={styles.heroSection}>
                        <div className={styles.heroIcon}>🎬</div>
                        <h2>Wrapped 2026</h2>
                        <p>Recopila las fotos, ubicaciones y cupones de este año en una experiencia tipo historia.</p>

                        <div className={styles.heroActions}>
                            <Button size="lg" onClick={handleGenerate} disabled={isGenerating}>
                                {isGenerating ? 'Recopilando memorias...' : '🔮 Generar Nuevo Wrapped'}
                            </Button>
                        </div>
                    </div>

                    <div className={styles.configArea}>
                        <div className={styles.toggleRow}>
                            <div className={styles.toggleInfo}>
                                <span className={styles.toggleLabel}>Mostrar Wrapped al usuario</span>
                                <span className={styles.toggleDesc}>Activa esto cuando quieras que ella reciba la notificación y vea el Wrapped de este año.</span>
                            </div>
                            <KawaiiInput type="toggle" value={isWrappedEnabled} onChange={(e) => setIsWrappedEnabled(e.target.value)} />
                        </div>
                    </div>
                </Card>

                {/* Past Wrapped Archive */}
                <div className={styles.archiveSection}>
                    <h3>Archivo de Años Anteriores</h3>
                    <div className={styles.grid}>
                        {pastWrappeds.map(wrapped => (
                            <Card key={wrapped.year} className={styles.archiveCard}>
                                <div className={styles.archiveHeader}>
                                    <h4 className={styles.archiveYear}>{wrapped.year}</h4>
                                    <span className={styles.badge}>Diciembre {wrapped.year}</span>
                                </div>
                                <h3 className={styles.archiveTitle}>{wrapped.title}</h3>
                                <div className={styles.archiveActions}>
                                    <Button variant="secondary" size="sm">▶ Ver Preview</Button>
                                    <Button variant="ghost" size="sm" title="Revisar configuración de hace un año">⚙️ Editar</Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
