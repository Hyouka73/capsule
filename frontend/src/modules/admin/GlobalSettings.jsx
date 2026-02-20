import { useState } from 'react';
import Card from '../../components/ui/Card/Card';
import Button from '../../components/ui/Button/Button';
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
        mapOptions: {
            lat: 19.4326,
            lng: -99.1332,
            zoom: 12
        }
    });

    const [isSaving, setIsSaving] = useState(false);

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

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            alert('Configuración global guardada.');
        }, 800);
    };

    const handleCopyInvite = () => {
        navigator.clipboard.writeText(settings.inviteLink);
        alert('Enlace copiado al portapapeles');
    };

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Configuración Global</h1>
                    <p className={styles.subtitle}>Administra los módulos activos, permisos y opciones generales de la app.</p>
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
            </div>

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
                            <input type="text" readOnly value={settings.inviteLink} className={styles.input} />
                            <Button variant="secondary" onClick={handleCopyInvite}>Copiar</Button>
                        </div>
                        <p className={styles.helpText}>Compártelo para que ella pueda registrarse e ingresar a la cápsula.</p>
                        <Button variant="ghost" size="sm" className={styles.revokeBtn} onClick={() => alert('Mock: Regenerando link...')}>↻ Revocar y generar nuevo enlace</Button>
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

                    <div className={styles.formGroup}>
                        <label>Centro del Mapa (Por defecto)</label>
                        <div className={styles.coordInputs}>
                            <input type="number" step="0.0001" value={settings.mapOptions.lat} onChange={e => setSettings(p => ({ ...p, mapOptions: { ...p.mapOptions, lat: parseFloat(e.target.value) } }))} className={styles.input} placeholder="Latitud" />
                            <input type="number" step="0.0001" value={settings.mapOptions.lng} onChange={e => setSettings(p => ({ ...p, mapOptions: { ...p.mapOptions, lng: parseFloat(e.target.value) } }))} className={styles.input} placeholder="Longitud" />
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
            <label className={styles.switch}>
                <input type="checkbox" checked={checked} onChange={onChange} />
                <span className={styles.slider}></span>
            </label>
        </div>
    );
}
