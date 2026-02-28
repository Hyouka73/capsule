import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Card from '../../components/ui/Card/Card';
import Button from '../../components/ui/Button/Button';
import KawaiiInput from '../../components/ui/KawaiiInput/KawaiiInput';
import { getGlobalSettings, saveGlobalSettings, saveSnapshotConfig } from '../../services/settingsService';
import { generateInviteToken } from '../../apiClient';
import styles from './GlobalSettings.module.css';

export default function GlobalSettings() {
    const [settings, setSettings] = useState({
        modules: {
            capsules: true,
            coupons: true,
            bingo: true,
            wrapped: false
        },
        visibility: {
            showCapsulesBeforeUnlock: true,
            showAdminNotes: false
        },
        inviteLink: 'https://app.tu-dominio.com/invite/baka-love-2026',
        citaConfig: {
            minPhotosSpontaneous: 5,
            minPhotosBingoDefault: 3
        }
    });

    const [snapshotTimer, setSnapshotTimer] = useState(9);

    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const data = await getGlobalSettings();
                if (data) setSettings(data);
                // Load snapshotConfig from appConfig/main
                const appConfigSnap = await getDoc(doc(db, 'appConfig', 'main'));
                if (appConfigSnap.exists()) {
                    const ac = appConfigSnap.data();
                    if (ac.snapshotConfig?.timerSeconds) {
                        setSnapshotTimer(ac.snapshotConfig.timerSeconds);
                    }
                }
            } catch (err) {
                console.error('Error loading settings:', err);
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, []);

    const handleToggleModule = (mod) => {
        setSettings(prev => ({
            ...prev,
            modules: { ...prev.modules, [mod]: !prev.modules[mod] }
        }));
    };

    const handleToggleVisibility = (vis) => {
        setSettings(prev => ({
            ...prev,
            visibility: { ...prev.visibility, [vis]: !prev.visibility[vis] }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveGlobalSettings(settings);
            await saveSnapshotConfig({ timerSeconds: snapshotTimer });
            alert('Configuración global guardada en la base de datos.');
        } catch (err) {
            console.error('Error saving settings:', err);
            alert('Error al guardar la configuración.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyInvite = () => {
        navigator.clipboard.writeText(settings.inviteLink);
        alert('Enlace copiado al portapapeles');
    };

    const handleRegenerateInvite = async () => {
        if (!confirm('¿Seguro? El enlace anterior dejará de funcionar para nuevos dispositivos.')) return;
        try {
            const { inviteUrl } = await generateInviteToken({ expiresInDays: 7 });
            setSettings(prev => ({ ...prev, inviteLink: inviteUrl }));
            alert('¡Nuevo enlace generado exitosamente!');
        } catch (err) {
            console.error('Error generating token:', err);
            alert('Error al generar el token: ' + err.message);
        }
    };

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Configuración Global</h1>
                    <p className={styles.subtitle}>Administra los módulos activos, permisos y opciones generales de la app.</p>
                </div>
                <Button onClick={handleSave} disabled={isSaving || isLoading}>
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
            </div>

            {isLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando configuración...</div>
            ) : (
                <div className={styles.grid}>
                    {/* Modules Toggle */}
                    <Card className={styles.sectionCard} glass>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionIcon}>🧩</span>
                            <h3>Módulos Activos (Feature Flags)</h3>
                        </div>
                        <p className={styles.sectionDesc}>Habilita o deshabilita secciones enteras para el usuario final.</p>

                        <div className={styles.togglesList}>
                            <ToggleRow
                                label="Cápsulas del Tiempo"
                                desc="Permite ver las cápsulas programadas en su timeline temporal."
                                checked={settings.modules.capsules}
                                onChange={() => handleToggleModule('capsules')}
                            />
                            <ToggleRow
                                label="Talonario de Cupones"
                                desc="Habilita la vista de los talonarios de favores canjeables."
                                checked={settings.modules.coupons}
                                onChange={() => handleToggleModule('coupons')}
                            />
                            <ToggleRow
                                label="Bingo del Amor"
                                desc="Muestra la tarjeta 4x5 interactiva."
                                checked={settings.modules.bingo}
                                onChange={() => handleToggleModule('bingo')}
                            />
                            <ToggleRow
                                label="Wrapped Anual"
                                desc="Activa el resumen del año. ¡Enciéndelo solo cuando esté listo!"
                                checked={settings.modules.wrapped}
                                onChange={() => handleToggleModule('wrapped')}
                            />
                        </div>
                    </Card>

                    {/* Account & Security */}
                    <Card className={styles.sectionCard} glass>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionIcon}>🔒</span>
                            <h3>Acceso y Seguridad</h3>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Enlace de Invitación Activo</label>
                            <div className={styles.inviteWrapper}>
                                <div style={{ flex: 1 }}>
                                    <KawaiiInput type="text" readOnly value={settings.inviteLink} />
                                </div>
                                <Button variant="secondary" onClick={handleCopyInvite}>Copiar</Button>
                            </div>
                            <p className={styles.helpText}>Compártelo para que ella pueda registrarse e ingresar a la cápsula.</p>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={styles.revokeBtn}
                                onClick={handleRegenerateInvite}
                            >
                                ↻ Revocar y generar nuevo enlace
                            </Button>
                        </div>

                        <div className={styles.divider}></div>

                        <div className={styles.togglesList}>
                            <ToggleRow
                                label="Mostrar cápsulas bloqueadas"
                                desc="Si está inactivo, las cápsulas de tiempo serán invisibles hasta que se abran."
                                checked={settings.visibility.showCapsulesBeforeUnlock}
                                onChange={() => handleToggleVisibility('showCapsulesBeforeUnlock')}
                            />
                            <ToggleRow
                                label="Mostrar 'Admin Notes'"
                                desc="Si está activo, ella podrá leer las notas internas que dejaste en algunos recuerdos."
                                checked={settings.visibility.showAdminNotes}
                                onChange={() => handleToggleVisibility('showAdminNotes')}
                            />
                        </div>
                    </Card>

                    {/* Data & Others */}
                    <Card className={styles.sectionCard} glass>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionIcon}>🗺️</span>
                            <h3>Mapa y Multimedia</h3>
                        </div>

                        <div className={styles.divider}></div>

                        <div className={styles.formGroup}>
                            <label>Fotos mínimas (Modo Cita)</label>
                            <p className={styles.helpText}>Cuántas fotos se requieren para poder guardar una cita.</p>
                            <div className={styles.citaInputs}>
                                <div className={styles.inputField} style={{ flex: 1 }}>
                                    <KawaiiInput
                                        type="number"
                                        label="Cita Espontánea"
                                        value={settings.citaConfig.minPhotosSpontaneous}
                                        onChange={e => setSettings(p => ({ ...p, citaConfig: { ...p.citaConfig, minPhotosSpontaneous: parseInt(e.target.value) || 1 } }))}
                                    />
                                </div>
                                <div className={styles.inputField} style={{ flex: 1 }}>
                                    <KawaiiInput
                                        type="number"
                                        label="Bingo (Por defecto)"
                                        value={settings.citaConfig.minPhotosBingoDefault}
                                        onChange={e => setSettings(p => ({ ...p, citaConfig: { ...p.citaConfig, minPhotosBingoDefault: parseInt(e.target.value) || 1 } }))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={styles.divider}></div>

                        <div className={styles.formGroup}>
                            <label>📸 Instantáneas — Timer</label>
                            <p className={styles.helpText}>Cuántos segundos se muestra la instantánea antes de cerrarse automáticamente.</p>
                            <div style={{ maxWidth: 180 }}>
                                <KawaiiInput
                                    type="number"
                                    label="Segundos"
                                    value={snapshotTimer}
                                    onChange={e => setSnapshotTimer(Math.max(1, parseInt(e.target.value) || 1))}
                                />
                            </div>
                        </div>

                        <div className={styles.divider}></div>

                        <div className={styles.dangerZone}>
                            <h4>Zona de Mantenimiento</h4>
                            <div className={styles.dangerActions}>
                                <Button variant="secondary" onClick={() => alert('Mock: Iniciando backup a Firebase Storage...')}>📥 Forzar Backup de Base de Datos</Button>
                                <Button className={styles.dangerBtn} onClick={() => alert('Mock: Limpiando caché...')}>🗑️ Limpiar Caché de Imágenes</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

function ToggleRow({ label, desc, checked, onChange }) {
    return (
        <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
                <span className={styles.toggleLabel}>{label}</span>
                <span className={styles.toggleDesc}>{desc}</span>
            </div>
            <KawaiiInput type="toggle" value={checked} onChange={e => {
                if (onChange) onChange();
            }} />
        </div>
    );
}
