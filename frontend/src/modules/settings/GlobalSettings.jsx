import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card/Card';
import Button from '../../components/ui/Button/Button';
import KawaiiInput from '../../components/ui/KawaiiInput/KawaiiInput';
import { toast } from '../../components/ui/PastelToast/PastelToast';
import { getGlobalSettings, saveGlobalSettings, updateConfig } from '../../services/settingsService';
import { generateInviteToken } from '../../apiClient';
import SystemConfig from '../../models/SystemConfig';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import LoadingScreen from '../../components/ui/LoadingScreen/LoadingScreen';
import Skeleton from '../../components/ui/Skeleton/Skeleton';
import styles from './GlobalSettings.module.css';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
        y: 0, 
        opacity: 1,
        transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
};

export default function GlobalSettings() {
    const [config, setConfig] = useState(new SystemConfig());
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [showInviteConfirm, setShowInviteConfirm] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const data = await getGlobalSettings();
                if (data) {
                    setConfig(SystemConfig.fromFirestore(data));
                }
            } catch (err) {
                console.error('Error loading settings:', err);
                toast.error('Error', 'No se pudo cargar la configuración.');
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, []);

    const handleUpdate = (path, value) => {
        const parts = path.split('.');
        setConfig(prev => {
            const newConfig = new SystemConfig({
                features: { ...prev.features },
                visibility: { ...prev.visibility },
                wrappedConfig: { ...prev.wrappedConfig },
                mapConfig: { ...prev.mapConfig },
                notifications: { ...prev.notifications },
                snapshotConfig: { ...prev.snapshotConfig },
                teaser: { ...prev.teaser },
                inviteConfig: { ...prev.inviteConfig },
                citaConfig: { ...prev.citaConfig },
                onboarding: { 
                    ...prev.onboarding,
                    modules: { ...prev.onboarding?.modules }
                }
            });
            
            if (parts.length === 1) {
                newConfig[parts[0]] = value;
            } else if (parts.length === 2) {
                newConfig[parts[0]][parts[1]] = value;
            } else if (parts.length === 3) {
                // Handle nested objects like mapConfig.defaultCenter.lat
                newConfig[parts[0]][parts[1]][parts[2]] = value;
            }
            return newConfig;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveGlobalSettings(config.toFirestore());
            toast.success('¡Configuración Guardada!', 'Los cambios se han aplicado en toda la app.');
        } catch (err) {
            console.error('Error saving settings:', err);
            toast.error('Error al guardar.', 'No se pudo aplicar la configuración.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyInvite = () => {
        if (!config.inviteConfig.inviteLink) {
            toast.info('Sin enlace', 'Genera uno nuevo para poder copiarlo.');
            return;
        }
        navigator.clipboard.writeText(config.inviteConfig.inviteLink);
        toast.success('Enlace copiado.', 'Comparte este link con tu pareja.');
    };

    const handleRegenerateInvite = async () => {
        setShowInviteConfirm(false);
        setIsRegenerating(true);
        try {
            const { tokenId } = await generateInviteToken({ expiresInDays: 7 });
            const BASE_URL = import.meta.env.VITE_APP_URL || window.location.origin;
            const inviteUrl = `${BASE_URL}/join?t=${tokenId}`;
            const now = new Date().toISOString();
            
            // 1. Update local state
            handleUpdate('inviteConfig.inviteLink', inviteUrl);
            handleUpdate('inviteConfig.generatedAt', now);

            // 2. Persist automatically
            await updateConfig({ 
                inviteConfig: { 
                    inviteLink: inviteUrl, 
                    generatedAt: now 
                } 
            });

            toast.success('¡Enlace generado!', 'Link generado y guardado ✓');
        } catch (err) {
            console.error('Error in regenerate invite flow:', err);
            toast.error('Error al generar enlace', 'Link generado pero no se pudo guardar. Cópialo antes de cerrar.');
        } finally {
            setIsRegenerating(false);
        }
    };

    // Removed full-screen LoadingScreen return to support skeleton states

    return (
        <motion.div 
            className={styles.root}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.header className={styles.header} variants={itemVariants}>
                <h1 className={styles.title}>Panel de Control</h1>
                <p className={styles.subtitle}>Configuración técnica del núcleo de la aplicación.</p>
            </motion.header>

            <div className={styles.grid}>
                {/* Modules Toggle */}
                <motion.div variants={itemVariants}>
                    <Card className={styles.sectionCard} glass>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionIcon}>🧩</span>
                            <h3>Módulos del Sistema</h3>
                        </div>
                        <p className={styles.sectionDesc}>Habilita o deshabilita secciones principales.</p>

                        <div className={styles.togglesList}>
                            <ToggleRow
                                label="Mapa"
                                desc="Visualización geográfica de vuestras citas."
                                checked={config.features.memoryMap}
                                onChange={() => handleUpdate('features.memoryMap', !config.features.memoryMap)}
                            />
                            <ToggleRow
                                label="Galería"
                                desc="Acceso directo a todo el contenido multimedia."
                                checked={config.features.photoGallery}
                                onChange={() => handleUpdate('features.photoGallery', !config.features.photoGallery)}
                            />
                            <ToggleRow
                                label="Cápsulas"
                                desc="Línea temporal de momentos programados."
                                checked={config.features.timeCapsules}
                                onChange={() => handleUpdate('features.timeCapsules', !config.features.timeCapsules)}
                            />
                            <ToggleRow
                                label="Cupones"
                                desc="Favores canjeables y regalos digitales."
                                checked={config.features.coupons}
                                onChange={() => handleUpdate('features.coupons', !config.features.coupons)}
                            />
                            <ToggleRow
                                label="Bingo"
                                desc="Juego interactivo de misiones en pareja."
                                checked={config.features.bingoBoard}
                                onChange={() => handleUpdate('features.bingoBoard', !config.features.bingoBoard)}
                            />
                        </div>

                        <div className={styles.divider}></div>
                        
                        <div className={styles.togglesList}>
                            <ToggleRow
                                label="Ejercicio"
                                desc="Seguimiento de actividad y rachas físicas."
                                checked={config.features.exercise}
                                onChange={() => handleUpdate('features.exercise', !config.features.exercise)}
                            />
                            <ToggleRow
                                label="Películas"
                                desc="Lista de películas para ver y comentar."
                                checked={config.features.movieTracking}
                                onChange={() => handleUpdate('features.movieTracking', !config.features.movieTracking)}
                            />
                            <ToggleRow
                                label="Juegos"
                                desc="Minijuegos y dinámicas interactivas."
                                checked={config.features.games}
                                onChange={() => handleUpdate('features.games', !config.features.games)}
                            />
                            <ToggleRow
                                label="Huevos de Pascua"
                                desc="Animaciones y sorpresas ocultas en la UI."
                                checked={config.features.easterEggs}
                                onChange={() => handleUpdate('features.easterEggs', !config.features.easterEggs)}
                            />
                            <ToggleRow
                                label="Onboarding"
                                desc="Guía interactiva para nuevos usuarios."
                                checked={config.features.onboarding}
                                onChange={() => handleUpdate('features.onboarding', !config.features.onboarding)}
                            />
                        </div>
                    </Card>
                </motion.div>

                {/* Map & Visual Settings */}
                <motion.div variants={itemVariants}>
                    <Card className={styles.sectionCard} glass>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionIcon}>🗺️</span>
                            <h3>Configuración del Mapa</h3>
                        </div>
                        
                        <div className={styles.formGroup}>
                            <label>Centro por Defecto</label>
                            <div className={styles.citaInputs}>
                                <div className={styles.inputField}>
                                    <KawaiiInput
                                        type="number"
                                        label="Latitud"
                                        value={config.mapConfig.defaultCenter.lat}
                                        onChange={e => handleUpdate('mapConfig.defaultCenter.lat', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className={styles.inputField}>
                                    <KawaiiInput
                                        type="number"
                                        label="Longitud"
                                        value={config.mapConfig.defaultCenter.lng}
                                        onChange={e => handleUpdate('mapConfig.defaultCenter.lng', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                            <div className={styles.citaInputs}>
                                <div className={styles.inputField}>
                                    <KawaiiInput
                                        type="number"
                                        label="Zoom Inicial"
                                        value={config.mapConfig.defaultZoom}
                                        onChange={e => handleUpdate('mapConfig.defaultZoom', parseInt(e.target.value) || 12)}
                                    />
                                </div>
                                <div className={styles.inputField}>
                                    <KawaiiInput
                                        type="select"
                                        label="Estilo Visual"
                                        value={config.mapConfig.style}
                                        onChange={e => handleUpdate('mapConfig.style', e.target.value)}
                                        options={[
                                            { id: 'romantic-vintage', name: '🌹 Romantic Vintage' },
                                            { id: 'pastel-dream', name: '☁️ Pastel Dream' },
                                            { id: 'dark-luxury', name: '🎬 Dark Luxury' },
                                            { id: 'standard', name: '🗺️ Standard Map' }
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={styles.divider}></div>

                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionIcon}>🔔</span>
                            <h3>Notificaciones Push</h3>
                        </div>
                        <div className={styles.togglesList}>
                            <ToggleRow
                                label="FCM para la Pareja"
                                desc="Enviar avisos de nuevas fotos o mensajes al partner."
                                checked={config.notifications.partnerFcmEnabled}
                                onChange={() => handleUpdate('notifications.partnerFcmEnabled', !config.notifications.partnerFcmEnabled)}
                            />
                            <ToggleRow
                                label="Log de Actividad Admin"
                                desc="Notificar al administrador sobre cambios en el sistema."
                                checked={config.notifications.adminActivityLogEnabled}
                                onChange={() => handleUpdate('notifications.adminActivityLogEnabled', !config.notifications.adminActivityLogEnabled)}
                            />
                        </div>
                    </Card>

                    <Card className={styles.sectionCard} glass style={{ marginTop: '2rem' }}>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionIcon}>🔒</span>
                            <h3>Acceso y Seguridad</h3>
                        </div>

                        <div className={styles.inviteContainer}>
                            <div className={styles.inviteHeader}>
                                <label className={styles.inviteLabel}>Enlace de Invitación</label>
                                {config.inviteConfig.generatedAt && (
                                    <span className={styles.inviteDate}>
                                        Generado el {new Date(config.inviteConfig.generatedAt).toLocaleDateString()}
                                    </span>
                                )}
                            </div>

                            <div className={styles.inviteGroup}>
                                <div className={styles.inviteInputWrapper}>
                                    {isLoading || isRegenerating ? (
                                        <Skeleton height="48px" className={styles.skeletonRadius} />
                                    ) : (
                                        <KawaiiInput 
                                            type="text" 
                                            readOnly 
                                            placeholder="Pulsa regenerar para crear uno..."
                                            value={config.inviteConfig.inviteLink}
                                            className={styles.cleanInput}
                                        />
                                    )}
                                </div>
                                <Button 
                                    variant="primary" 
                                    onClick={handleCopyInvite} 
                                    disabled={isLoading || !config.inviteConfig.inviteLink}
                                    className={styles.copyBtn}
                                >
                                    📋 Copiar
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowInviteConfirm(true)}
                                    disabled={isRegenerating || isLoading}
                                    className={styles.miniRevokeBtn}
                                    title="Regenerar enlace"
                                >
                                    {isRegenerating ? '↻' : '↻'}
                                </Button>
                            </div>
                        </div>
                        
                        <div className={styles.divider}></div>

                        <ToggleRow
                            label="Notas del Administrador"
                            desc="Permitir que ella lea las anotaciones internas."
                            checked={config.visibility.showAdminNotes}
                            onChange={() => handleUpdate('visibility.showAdminNotes', !config.visibility.showAdminNotes)}
                        />
                    </Card>
                </motion.div>

                {/* Critical Dates Section */}
                <motion.div variants={itemVariants}>
                    <Card className={styles.sectionCard} glass>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionIcon}>📅</span>
                            <h3>Fechas Críticas</h3>
                        </div>
                        <p className={styles.sectionDesc}>Eventos detonantes del sistema.</p>

                        <div className={styles.formGroup}>
                            <KawaiiInput
                                type="datetime-local"
                                label="🚀 Fecha y hora de lanzamiento"
                                value={config.teaser?.unlockAt ? config.teaser.unlockAt.substring(0, 16) : ''}
                                onChange={e => handleUpdate('teaser.unlockAt', e.target.value)}
                                helpText="Fecha en que ella podrá entrar a la app por primera vez."
                            />
                        </div>
                    </Card>
                </motion.div>

                {/* Wrapped & Multimedia */}
                <motion.div variants={itemVariants}>
                    <Card className={styles.sectionCard} glass>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionIcon}>✨</span>
                            <h3>Configuración de Wrapped</h3>
                        </div>

                        <div className={styles.formGroup}>
                            <div className={styles.citaInputs}>
                                <div className={styles.inputField}>
                                    <KawaiiInput
                                        type="text"
                                        label="Fecha Aniversario"
                                        placeholder="MM-DD"
                                        value={config.wrappedConfig.anniversaryDate}
                                        onChange={e => handleUpdate('wrappedConfig.anniversaryDate', e.target.value)}
                                    />
                                </div>
                                <div className={styles.inputField}>
                                    <KawaiiInput
                                        type="number"
                                        label="Año de Inicio"
                                        value={config.wrappedConfig.anniversaryYear}
                                        onChange={e => handleUpdate('wrappedConfig.anniversaryYear', parseInt(e.target.value) || 2022)}
                                    />
                                </div>
                                <div className={styles.inputField}>
                                    <KawaiiInput
                                        type="text"
                                        label="Próximo Lanzamiento"
                                        placeholder="YYYY-MM-DD"
                                        value={config.wrappedConfig.nextWrappedDate}
                                        onChange={e => handleUpdate('wrappedConfig.nextWrappedDate', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                            <KawaiiInput
                                type="select"
                                label="Criterio de Estadísticas"
                                value={config.wrappedConfig.defaultStatsMode}
                                onChange={e => handleUpdate('wrappedConfig.defaultStatsMode', e.target.value)}
                                options={[
                                    { id: 'eventDate', name: '📅 Fecha del Suceso (Lo que pasó)' },
                                    { id: 'createdDate', name: '☁️ Fecha de Subida (Cuando se guardó)' }
                                ]}
                            />
                            <p className={styles.helpText}>Define cómo se agrupan los recuerdos en el resumen anual.</p>
                        </div>

                        <div className={styles.divider}></div>

                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionIcon}>📸</span>
                            <h3>Reglas de Multimedia</h3>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Fotos Mínimas por Cita</label>
                            <div className={styles.citaInputs}>
                                <div className={styles.inputField}>
                                    <KawaiiInput
                                        type="number"
                                        label="Espontánea"
                                        value={config.citaConfig.minPhotosSpontaneous}
                                        onChange={e => handleUpdate('citaConfig.minPhotosSpontaneous', parseInt(e.target.value) || 1)}
                                    />
                                </div>
                                <div className={styles.inputField}>
                                    <KawaiiInput
                                        type="number"
                                        label="Modo Bingo"
                                        value={config.citaConfig.minPhotosBingoDefault}
                                        onChange={e => handleUpdate('citaConfig.minPhotosBingoDefault', parseInt(e.target.value) || 1)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                            <label>⏱️ Timer de Instantáneas</label>
                            <div style={{ maxWidth: 160 }}>
                                <KawaiiInput
                                    type="number"
                                    label="Segundos"
                                    value={config.snapshotConfig.timerSeconds}
                                    onChange={e => handleUpdate('snapshotConfig.timerSeconds', Math.max(1, parseInt(e.target.value) || 1))}
                                />
                            </div>
                        </div>

                        <div className={styles.dangerZone}>
                            <h4>Acciones Críticas</h4>
                            <div className={styles.dangerActions}>
                                <Button className={styles.dangerBtn} onClick={() => toast.info('Beta', 'Backup en desarrollo')}>
                                    📥 Backup BD
                                </Button>
                                <Button className={styles.dangerBtn} onClick={() => toast.success('Caché', 'Limpieza completada')}>
                                    🗑️ Limpiar Caché
                                </Button>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </div>

            {/* Sticky Save Bar */}
            <motion.div 
                className={styles.footer}
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.5, type: 'spring', damping: 20 }}
            >
                <div className={styles.footerContent}>
                    <div className={styles.statusIndicator}>
                        <span className={styles.dot}></span>
                        <span>Configuración del Núcleo v1.6.15</span>
                    </div>
                    <Button 
                        className={styles.saveBtn} 
                        onClick={handleSave} 
                        disabled={isSaving}
                    >
                        {isSaving ? 'Aplicando cambios...' : '✨ Guardar Cambios del Sistema'}
                    </Button>
                </div>
            </motion.div>

            {/* Modals */}
            <ConfirmModal
                isOpen={showInviteConfirm}
                title="¿Regenerar enlace de invitación?"
                message="El enlace anterior dejará de funcionar para nuevos dispositivos."
                confirmText="Sí, regenerar"
                cancelText="Cancelar"
                onConfirm={handleRegenerateInvite}
                onCancel={() => setShowInviteConfirm(false)}
                emoji="🔒"
            />
        </motion.div>
    );
}

function ToggleRow({ label, desc, checked, onChange }) {
    return (
        <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
                <span className={styles.toggleLabel}>{label}</span>
                <span className={styles.toggleDesc}>{desc}</span>
            </div>
            <KawaiiInput type="toggle" value={checked} onChange={onChange} />
        </div>
    );
}
