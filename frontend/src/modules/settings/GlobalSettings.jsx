import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card/Card';
import Button from '../../components/ui/Button/Button';
import KawaiiInput from '../../components/ui/KawaiiInput/KawaiiInput';
import { toast } from '../../components/ui/PastelToast/PastelToast';
import { getGlobalSettings, saveGlobalSettings, updateConfig } from '../../services/settingsService';
import { generateInviteToken, revokePartner } from '../../apiClient';
import SystemConfig from '../../models/SystemConfig';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import LoadingScreen from '../../components/ui/LoadingScreen/LoadingScreen';
import Skeleton from '../../components/ui/Skeleton/Skeleton';
import { useAppConfig } from '../../context/AppConfigContext';
import SystemConfigSection from './components/SystemConfig';
import ToggleRow from './components/ToggleRow';
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
    const { refreshConfig } = useAppConfig();
    const [config, setConfig] = useState(new SystemConfig());
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [showInviteConfirm, setShowInviteConfirm] = useState(false);
    const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
    const [tempTeaserDate, setTempTeaserDate] = useState('');


    useEffect(() => {
        async function load() {
            try {
                const data = await getGlobalSettings();
                if (data) {
                    const loadedConfig = SystemConfig.fromFirestore(data);
                    setConfig(loadedConfig);
                    // Sync local date string
                    if (loadedConfig.teaser?.unlockAt) {
                        const d = new Date(loadedConfig.teaser.unlockAt);
                        const iso = d.toLocaleString('sv').replace(' ', 'T').slice(0, 16);
                        setTempTeaserDate(iso);
                    }
                }
            } catch (err) {
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
                partner: { ...prev.partner },
                memoryTags: [...prev.memoryTags],
                teaser: { ...prev.teaser },
                inviteConfig: { ...prev.inviteConfig },
                citaConfig: { ...prev.citaConfig },
                onboarding: { 
                    ...prev.onboarding,
                    modules: { ...prev.onboarding?.modules }
                },
                modules: { ...prev.modules }
            });
            
            if (parts.length === 1) {
                newConfig[parts[0]] = value;
            } else if (parts.length === 2) {
                newConfig[parts[0]][parts[1]] = value;
            } else if (parts.length === 3) {
                // Handle nested objects like mapConfig.defaultCenter.lat
                newConfig[parts[0]][parts[1]][parts[2]] = value;
            } else if (parts.length === 4) {
                // Handle modules.bingo.isEnabled
                newConfig[parts[0]][parts[1]][parts[2]][parts[3]] = value;
            }
            return newConfig;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const fullData = config.toFirestore();
            let payload = {};
            
            // Only send the configuration chunks that belong to the active tab
            switch(activeTab) {
                case 'modules':
                     payload = { modules: fullData.modules, features: fullData.features, onboarding: fullData.onboarding };
                     break;
                case 'services':
                     payload = { mapConfig: fullData.mapConfig, notifications: fullData.notifications };
                     break;
                case 'custom':
                     payload = { teaser: fullData.teaser, memoryTags: fullData.memoryTags };
                     break;
                case 'multimedia':
                     payload = { wrapped: fullData.wrapped, multimedia: fullData.multimedia };
                     break;
                case 'security':
                     payload = { visibility: fullData.visibility };
                     break;
                default:
                     payload = fullData;
            }

            await updateConfig(payload);
            await refreshConfig(true); // force=true: bypass cache, always fetch fresh
            toast.success('¡Guardado!', `Cambios de ${activeTab} aplicados.`);
        } catch (err) {
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
            const { tokenId, inviteUrl } = await generateInviteToken({ expiresAtDays: 7 });
            
            // We NO LONGER need to call updateConfig here because the backend 
            // already updated the Firestore document. Doing it twice 
            // causes race conditions that 'reactivate' the old partner.
            
            // However, we MUST update our local context state so the UI 
            // shows the new link and doesn't think there's still a partner.
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            setConfig(prev => {
                const newConfig = new SystemConfig(prev);
                newConfig.partnerUid = null; // Correct property in SystemConfig model
                newConfig.inviteConfig = {
                    inviteLink: inviteUrl,
                    generatedAt: new Date().toISOString(),
                    expiresAt: expiresAt.toISOString(),
                    isActive: true
                };
                return newConfig;
            });

            toast.success('¡Link Regenerado!', 'Se ha creado un nuevo código de invitación.');
        } catch (err) {
            toast.error('Error al generar enlace', 'Link generado pero no se pudo guardar. Cópialo antes de cerrar.');
        } finally {
            setIsRegenerating(false);
        }
    };

    // Removed full-screen LoadingScreen return to support skeleton states

    const [activeTab, setActiveTab] = useState('modules'); // 'modules', 'services', 'custom', 'multimedia', 'security'

    const TABS = [
        { id: 'modules', label: '🧩 Módulos' },
        { id: 'services', label: '🗺️ Servicios' },
        { id: 'custom', label: '🏷️ Personalización' },
        { id: 'multimedia', label: '🎬 Multimedia' },
        { id: 'security', label: '🔒 Seguridad' },
    ];

    if (isLoading) return <LoadingScreen message="Cargando configuración..." />;

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

            {/* ── Tabs Navigation ── */}
            <div className={styles.tabsNav}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className={styles.tabLabel}>{tab.label}</span>
                        {activeTab === tab.id && (
                            <motion.div 
                                layoutId="activeTabUnderline" 
                                className={styles.tabUnderline} 
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </button>
                ))}
            </div>

            <motion.div
                className={styles.grid}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                key={activeTab} // Unique key to trigger animation on tab change
            >
                {/* ── Tab: Modules ── */}
                {activeTab === 'modules' && (
                    <motion.div variants={itemVariants} className={styles.fullWidth}>
                        <SystemConfigSection 
                            config={config} 
                            handleUpdate={handleUpdate} 
                        />
                    </motion.div>
                )}

                {/* ── Tab: Services ── */}
                {activeTab === 'services' && (
                    <>
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
                            </Card>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Card className={styles.sectionCard} glass>
                                <div className={styles.sectionHeader}>
                                    <span className={styles.sectionIcon}>📍</span>
                                    <h3>Niveles de Pins del Mapa</h3>
                                </div>
                                <p className={styles.sectionDesc}>Configura el color y escala de los pins según las visitas.</p>
                                
                                <div className={styles.tiersTable}>
                                    <div className={styles.tiersHeader}>
                                        <span>Min. Visitas</span>
                                        <span>Color</span>
                                        <span>Escala</span>
                                        <span></span>
                                    </div>
                                    <div className={styles.tiersList}>
                                        {(config.mapConfig.pinTiers || []).map((tier, index) => (
                                            <div key={index} className={styles.tierRow}>
                                                <input 
                                                    type="number" 
                                                    className={styles.tierInput}
                                                    value={tier.minVisits}
                                                    onChange={(e) => {
                                                        const newTiers = [...config.mapConfig.pinTiers];
                                                        newTiers[index].minVisits = parseInt(e.target.value) || 0;
                                                        handleUpdate('mapConfig.pinTiers', newTiers);
                                                    }}
                                                />
                                                <div className={styles.colorPickerWrapper}>
                                                    <input 
                                                        type="color" 
                                                        className={styles.colorPicker}
                                                        value={tier.color}
                                                        onChange={(e) => {
                                                            const newTiers = [...config.mapConfig.pinTiers];
                                                            newTiers[index].color = e.target.value;
                                                            handleUpdate('mapConfig.pinTiers', newTiers);
                                                        }}
                                                    />
                                                    <span className={styles.colorHex}>{tier.color}</span>
                                                </div>
                                                <div className={styles.scaleWrapper}>
                                                    <input 
                                                        type="range" 
                                                        min="0.5" 
                                                        max="2.5" 
                                                        step="0.1"
                                                        className={styles.tierSlider}
                                                        value={tier.scale}
                                                        onChange={(e) => {
                                                            const newTiers = [...config.mapConfig.pinTiers];
                                                            newTiers[index].scale = parseFloat(e.target.value) || 1.0;
                                                            handleUpdate('mapConfig.pinTiers', newTiers);
                                                        }}
                                                    />
                                                    <span className={styles.scaleValue}>{tier.scale}x</span>
                                                </div>
                                                <button 
                                                    className={styles.tierRemoveBtn}
                                                    onClick={() => {
                                                        const newTiers = config.mapConfig.pinTiers.filter((_, i) => i !== index);
                                                        handleUpdate('mapConfig.pinTiers', newTiers);
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {(!config.mapConfig.pinTiers || config.mapConfig.pinTiers.length < 5) && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className={styles.addTierBtn}
                                            onClick={() => {
                                                const newTiers = [...(config.mapConfig.pinTiers || [])];
                                                const lastMin = newTiers.length > 0 ? newTiers[newTiers.length - 1].minVisits : 0;
                                                newTiers.push({ minVisits: lastMin + 5, color: "#FFB6C1", scale: 1.0 });
                                                handleUpdate('mapConfig.pinTiers', newTiers);
                                            }}
                                        >
                                            + Añadir Nivel
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Card className={styles.sectionCard} glass>
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
                        </motion.div>
                    </>
                )}

                {/* ── Tab: Customization ── */}
                {activeTab === 'custom' && (
                    <>
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
                                        value={tempTeaserDate}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setTempTeaserDate(val);
                                            if (!val) return;
                                            
                                            // Handle partial years (at least 4 digits for YYYY)
                                            const [datePart] = val.split('T');
                                            const year = datePart.split('-')[0];
                                            if (year.length < 4) return;

                                            const ms = new Date(val).getTime();
                                            if (!isNaN(ms)) {
                                                handleUpdate('teaser.unlockAt', ms);
                                            }
                                        }}
                                        helpText="Fecha en que ella podrá entrar a la app por primera vez."
                                    />
                                </div>
                                <div className={styles.togglesList} style={{ marginTop: '1rem' }}>
                                    <ToggleRow
                                        label="Habilitar Teaser"
                                        desc="Mostrar la cuenta regresiva antes del lanzamiento."
                                        checked={config.teaser?.isEnabled ?? true}
                                        onChange={() => handleUpdate('teaser.isEnabled', !(config.teaser?.isEnabled ?? true))}
                                    />
                                </div>
                            </Card>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Card className={styles.sectionCard} glass>
                                <div className={styles.sectionHeader}>
                                    <span className={styles.sectionIcon}>🏷️</span>
                                    <h3>Gestión de Tags</h3>
                                </div>
                                <p className={styles.sectionDesc}>Personaliza las etiquetas. El ID es permanente — puedes cambiar el nombre y emoji sin romper nada.</p>
                                <div className={styles.tagsContainer}>
                                    <div className={styles.tagsList}>
                                        {config.memoryTags.map((tag, index) => (
                                            <div key={tag.id || index} className={styles.tagEditRow}>
                                                <input 
                                                    type="text" 
                                                    className={styles.tagInputEmoji}
                                                    placeholder="✨"
                                                    value={tag.emoji || ''} 
                                                    onChange={(e) => {
                                                         const newTags = [...config.memoryTags];
                                                         newTags[index] = { ...newTags[index], emoji: e.target.value };
                                                         handleUpdate('memoryTags', newTags);
                                                    }}
                                                />
                                                <input 
                                                    type="text" 
                                                    className={styles.tagInputLabel}
                                                    placeholder="Nombre"
                                                    value={tag.label || ''} 
                                                    onChange={(e) => {
                                                         const newTags = [...config.memoryTags];
                                                         newTags[index] = { ...newTags[index], label: e.target.value };
                                                         handleUpdate('memoryTags', newTags);
                                                    }}
                                                />
                                                <span className={styles.tagIdBadge} title={`ID: ${tag.id}`}>
                                                    #{(tag.id || '').replace('tag_', '')}
                                                </span>
                                                <button 
                                                    className={styles.tagRemoveBtn}
                                                    onClick={() => {
                                                        const newTags = config.memoryTags.filter((_, i) => i !== index);
                                                        handleUpdate('memoryTags', newTags);
                                                    }}
                                                >✕</button>
                                            </div>
                                        ))}
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className={styles.addTagBtn}
                                        onClick={() => handleUpdate('memoryTags', [
                                            ...config.memoryTags, 
                                            { 
                                                id: `tag_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`, 
                                                label: 'Nuevo', 
                                                emoji: '✨' 
                                            }
                                        ])}
                                    >
                                        + Añadir Etiqueta
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    </>
                )}

                {/* ── Tab: Multimedia ── */}
                {activeTab === 'multimedia' && (
                    <>
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
                                    </div>
                                </div>
                                <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                                    <KawaiiInput
                                        type="select"
                                        label="Criterio de Estadísticas"
                                        value={config.wrappedConfig.defaultStatsMode}
                                        onChange={e => handleUpdate('wrappedConfig.defaultStatsMode', e.target.value)}
                                        options={[
                                            { id: 'eventDate', name: '📅 Fecha del Suceso' },
                                            { id: 'createdDate', name: '☁️ Fecha de Subida' }
                                        ]}
                                    />
                                </div>
                            </Card>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Card className={styles.sectionCard} glass>
                                <div className={styles.sectionHeader}>
                                    <span className={styles.sectionIcon}>📸</span>
                                    <h3>Reglas y Instantáneas</h3>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Fotos Mínimas</label>
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
                                <div className={styles.divider} />
                                <div className={styles.formGroup}>
                                    <KawaiiInput
                                        type="number"
                                        label="Timer Segundos"
                                        value={config.snapshotConfig.timerSeconds}
                                        onChange={e => handleUpdate('snapshotConfig.timerSeconds', Math.max(1, parseInt(e.target.value) || 1))}
                                    />
                                </div>
                            </Card>
                        </motion.div>
                    </>
                )}

                {/* ── Tab: Security ── */}
                {activeTab === 'security' && (
                    <motion.div variants={itemVariants} className={styles.fullWidth}>
                        <Card className={styles.sectionCard} glass>
                            <div className={styles.sectionHeader}>
                                <span className={styles.sectionIcon}>🔒</span>
                                <h3>Acceso y Seguridad</h3>
                            </div>
                            <div className={styles.inviteContainer}>
                                <div className={styles.inviteHeader}>
                                    <label className={styles.inviteLabel}>Enlace de Invitación</label>
                                    {config.inviteConfig.generatedAt && (
                                        <span className={styles.inviteDate}>
                                            Desde {new Date(config.inviteConfig.generatedAt).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                                <div className={styles.inviteGroup}>
                                    <div className={styles.inviteInputWrapper}>
                                        <KawaiiInput 
                                            type="text" 
                                            readOnly 
                                            value={config.inviteConfig.inviteLink}
                                            className={styles.cleanInput}
                                        />
                                    </div>
                                    <Button variant="primary" onClick={handleCopyInvite} className={styles.copyBtn}>📋</Button>
                                    <Button variant="ghost" onClick={() => setShowInviteConfirm(true)} className={styles.miniRevokeBtn}>↻</Button>
                                </div>
                            </div>
                            <div className={styles.divider} />
                            <ToggleRow
                                label="Notas del Administrador"
                                desc="Visibilidad de anotaciones internas para ella."
                                checked={config.visibility.showAdminNotes}
                                onChange={() => handleUpdate('visibility.showAdminNotes', !config.visibility.showAdminNotes)}
                            />
                            <div className={styles.dangerZone}>
                                <h4>Zona de Peligro</h4>
                                <div className={styles.dangerActions}>
                                    <Button 
                                        className={styles.dangerBtn} 
                                        onClick={() => setShowRevokeConfirm(true)}
                                    >
                                        💔 Desvincular Pareja
                                    </Button>
                                    <Button className={styles.dangerBtn} onClick={() => toast.info('Beta', 'Backup en desarrollo')}>📥 Backup</Button>
                                    <Button className={styles.dangerBtn} onClick={() => toast.success('Caché', 'Limpieza OK')}>🗑️ Limpiar</Button>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </motion.div>

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
                        <span>v1.6.15 — {activeTab.toUpperCase()}</span>
                    </div>
                    <Button 
                        className={styles.saveBtn} 
                        onClick={handleSave} 
                        disabled={isSaving}
                    >
                        {isSaving ? 'Aplicando...' : '✨ Guardar Cambios'}
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
            <ConfirmModal
                isOpen={showRevokeConfirm}
                title="¿Desvincular a tu pareja?"
                message="Tu pareja perderá el acceso a la aplicación de inmediato y todos sus tokens de sesión serán revocados. Esta acción no se puede deshacer sin una nueva invitación."
                confirmText="Sí, desvincular"
                cancelText="Cancelar"
                onConfirm={async () => {
                    setShowRevokeConfirm(false);
                    try {
                        const res = await revokePartner({ partnerUid: config.partnerUid });
                        if (res.success) {
                            toast.success('Pareja desvinculada', 'Se ha revocado el acceso correctamente.');
                            await refreshConfig(true);
                        }
                    } catch (err) {
                        toast.error('Error', err.message);
                    }
                }}
                onCancel={() => setShowRevokeConfirm(false)}
                emoji="💔"
            />
        </motion.div>
    );
}

