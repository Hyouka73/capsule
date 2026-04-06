import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './UserCapsules.module.css';
import CapsuleRitual from './components/CapsuleRitual/CapsuleRitual';
import { CapsuleIcons } from '../../icons/CapsuleIcons';
import { getCapsules, openCapsule } from '../../apiClient';
import { db } from '../../services/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import Button from '../../components/ui/Button/Button';

/**
 * Normaliza los campos raw de Firestore a los campos derivados que espera la UI.
 */
/**
 * Normaliza los campos raw de Firestore a los campos derivados que espera la UI.
 */
function normalizeCapsule(raw, now = Date.now()) {
    const opensAtRaw = raw.unlockDate || raw.opensAt || raw.unlockAt;
    const opensAt = opensAtRaw 
        ? (opensAtRaw.toDate ? opensAtRaw.toDate().getTime() : new Date(opensAtRaw).getTime())
        : null;

    let status = raw.status || 'locked';
    
    // Si ya expiró el tiempo, forzar estado unlocked si no es manual
    if (status === 'locked' && !raw.isUnlocked && opensAt && opensAt <= now && raw.unlockTrigger === 'date') {
        status = 'unlocked';
    } else if (!raw.status) {
        if (raw.isUnlocked) status = 'unlocked';
        else if (opensAt && opensAt > now) status = 'locked';
    }

    const opensInMs = opensAt ? opensAt - now : null;
    
    let unlockPrompt = '';
    if (opensInMs && opensInMs > 0) {
        if (opensInMs < 86400000) {
            // MENOS DE 24 HORAS: Mostrar horas y minutos
            const hours = Math.floor(opensInMs / 3600000);
            const minutes = Math.floor((opensInMs % 3600000) / 60000);
            unlockPrompt = `Faltan ${hours}h ${minutes}m`;
        } else {
            // MÁS DE 24 HORAS: Mostrar días redondeados hacia arriba
            const daysRemaining = Math.ceil(opensInMs / 86400000);
            unlockPrompt = `Faltan ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'}`;
        }
    }

    return {
        ...raw,
        status,
        autoDestroy: !!(raw.autoDestroy),
        type: raw.type || 'standard',
        unlockPrompt,
        destroyedAt: raw.destroyedAt 
            ? (raw.destroyedAt.toDate ? raw.destroyedAt.toDate().getTime() : new Date(raw.destroyedAt).getTime())
            : null,
    };
}

/**
 * UserCapsules — Vista de Cápsulas del Tiempo (Buzón)
 * Rediseñado con tokens y lógica de estados (locked, unlocked, destructible).
 */
export default function UserCapsules({ onModalStateChange }) {
    const { relationshipId } = useAuth();
    const { queueDeleteCapsule } = useOfflineQueue();
    const [capsules, setCapsules] = useState([]);
    const [locallyDeletedIds, setLocallyDeletedIds] = useState(new Set());
    const [activeTab, setActiveTab] = useState('unopened'); // 'unopened' | 'opened'
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCapsule, setSelectedCapsule] = useState(null);
    const [showDestruct, setShowDestruct] = useState(false);
    const [tick, setTick] = useState(Date.now()); // Para forzar re-render de timers
    const isMounted = useRef(true);

    // Notificar al padre si hay un modal abierto para ocultar el nav
    useEffect(() => {
        if (onModalStateChange) {
            onModalStateChange(!!selectedCapsule || showDestruct);
        }
    }, [selectedCapsule, showDestruct, onModalStateChange]);

    useEffect(() => {
        if (!relationshipId) return;

        setIsLoading(true);
        const capsRef = collection(db, 'relationships', relationshipId, 'capsules');
        const q = query(capsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const caps = snapshot.docs.map(doc => normalizeCapsule({ id: doc.id, ...doc.data() }, Date.now()));
            setCapsules(caps.filter(c => c.status !== 'destroyed'));
            setIsLoading(false);
        }, (err) => {
            console.error('[UserCapsules] Snapshot error:', err);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [relationshipId]);

    // Intervalo de 60 segundos para refrescar contadores locales
    useEffect(() => {
        const interval = setInterval(() => {
            setTick(Date.now());
            setCapsules(prev => prev.map(c => normalizeCapsule(c, Date.now())));
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleDownloadFiles = (files) => {
        if (!files || files.length === 0) return;
        files.forEach(file => {
            const a = document.createElement('a');
            a.href = file.url;
            a.download = file.fileName || 'capsule-file';
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    };

    const handleOpenCapsule = async (capsule) => {
        // Solo omitir la llamada si YA se registró como abierta o en proceso de destrucción
        if (capsule.status === 'opened' || capsule.status === 'pending_destruction') {
            setSelectedCapsule(capsule);
            return;
        }

        try {
            const res = await openCapsule({ capsuleId: capsule.id });
            if (!isMounted.current) return;
            if (res.success) {
                // Sincronizar el estado local inmediatamente
                const updatedCapsule = normalizeCapsule(res.capsule, Date.now());
                setCapsules(prev => prev.map(c => c.id === updatedCapsule.id ? updatedCapsule : c));
                setSelectedCapsule(updatedCapsule);
            }
        } catch {
            // Silently fail in prod
        }
    };

    const handleFinalClose = async () => {
        setSelectedCapsule(null);
        setShowDestruct(false);
    };

    const handleDestroy = (capsuleIdOverride = null) => {
        const id = capsuleIdOverride || selectedCapsule?.id;
        if (!id) return;

        // 1. Borrado OPTIMISTA: Ocultar inmediatamente en la UI
        setLocallyDeletedIds(prev => new Set(prev).add(id));

        // 2. Encolar borrado real en segundo plano
        queueDeleteCapsule(id).catch(err => {
            console.error('[UserCapsules] Error encolando borrado:', err);
        });

        // 3. Cerrar modales inmediatamente
        handleFinalClose();
    };

    const handleToggleModal = (capsule) => {
        if (!capsule) {
            // Caso: Cerrando el modal después de ver el contenido
            const wasAutoDestroy = selectedCapsule?.autoDestroy;
            const hasFiles = selectedCapsule?.files?.length > 0;

            if (wasAutoDestroy) {
                if (hasFiles) {
                    // Si tiene archivos, dar 30s para descargar
                    setShowDestruct(true);
                } else {
                    // Si NO tiene archivos, borrar de inmediato y cerrar modal sin esperar
                    handleDestroy(selectedCapsule.id);
                }
            } else {
                handleFinalClose();
            }
        } else {
            handleOpenCapsule(capsule);
        }
    };

    const filteredCapsules = capsules.filter(c => {
        // Filtro optimista: No mostrar si está marcado para borrar localmente
        if (locallyDeletedIds.has(c.id)) return false;

        // Pestaña "Regalos" (Sin abrir / Pendientes)
        if (activeTab === 'unopened') {
            // Incluimos explícitamente las bloqueadas (programadas) para que el partner vea el cronómetro
            return c.status === 'locked' || c.status === 'unlocked' || c.status === 'pending_destruction';
        }
        // Pestaña "Abiertas"
        if (activeTab === 'opened') {
            return c.status === 'opened';
        }
        return false;
    });


    if (isLoading) {
        return (
            <div className={styles.root}>
                <div className={styles.loading}>Cargando cápsulas... ✨</div>
            </div>
        );
    }

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <h1 className={styles.title}>Cápsulas</h1>
                <div className={styles.tabs}>
                    <button 
                        className={`${styles.tab} ${activeTab === 'unopened' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('unopened')}
                    >
                        🎁 Sin Abrir
                    </button>
                    <button 
                        className={`${styles.tab} ${activeTab === 'opened' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('opened')}
                    >
                        📂 Abiertas
                    </button>
                </div>
            </div>

            <div className={styles.grid}>
                {filteredCapsules.length > 0 ? (
                    filteredCapsules.map(capsule => (
                        <CapsuleCard
                            key={capsule.id}
                            capsule={capsule}
                            onOpen={() => handleToggleModal(capsule)}
                        />
                    ))
                ) : (
                    <div className={styles.empty}>
                        <p>{activeTab === 'unopened' ? 'No tienes cápsulas pendientes. ✨' : 'Aún no has guardado ninguna cápsula. 📂'}</p>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {selectedCapsule && !showDestruct && (
                    <CapsuleRitual
                        capsule={selectedCapsule}
                        layoutId={selectedCapsule.id}
                        onFinish={() => {
                        }}
                        onClose={() => handleToggleModal(null)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showDestruct && (
                    <DestructModal
                        files={selectedCapsule?.files || []}
                        onDownload={() => {
                            handleDownloadFiles(selectedCapsule.files);
                            handleDestroy();
                        }}
                        onSkip={handleDestroy}
                        onTimeUp={handleDestroy}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function CapsuleCard({ capsule, onOpen }) {
    const { status, type, teaserMessage, title, opensInDays, unlockPrompt, domain } = capsule;
    const [isGlowing, setIsGlowing] = useState(false);

    const isLocked = status === 'locked';
    const isDestructing = status === 'pending_destruction';
    const isUnlocked = status === 'unlocked' || status === 'opened';

    // Lógica de resplandor ALEATORIO
    useEffect(() => {
        if (!capsule.autoDestroy) return;
        
        let timeoutId;
        let isActive = true;

        const triggerGlow = () => {
            if (!isActive) return;
            
            // Tiempo que permanece ENCENDIDO (1.5s a 4s)
            const glowDuration = Math.random() * 2500 + 1500;
            // Tiempo que permanece APAGADO (2s a 6s)
            const darkDuration = Math.random() * 4000 + 2000;

            setIsGlowing(true);
            
            timeoutId = setTimeout(() => {
                if (!isActive) return;
                setIsGlowing(false);
                
                timeoutId = setTimeout(triggerGlow, darkDuration);
            }, glowDuration);
        };

        // Iniciar ciclo con un pequeño retraso inicial random para que no todas brillen a la vez
        const initialDelay = Math.random() * 3000;
        timeoutId = setTimeout(triggerGlow, initialDelay);

        return () => {
            isActive = false;
            clearTimeout(timeoutId);
        };
    }, [capsule.autoDestroy]);

    // Icono dinámico desde el módulo externo
    const Icon = CapsuleIcons[type] || CapsuleIcons['message'];

    const getCardClass = () => {
        if (isLocked) return styles.cardLocked;
        if (isDestructing) return styles.cardDestructible;
        return styles.cardUnlocked;
    };

    return (
        <motion.div
            layoutId={capsule.id}
            whileHover={!isLocked ? { scale: 1.02 } : {}}
            whileTap={!isLocked ? { scale: 0.98 } : {}}
            className={`${styles.card} ${getCardClass()} ${isGlowing ? styles.cardAutodestroy : ''}`}
            onClick={() => {
                if (!isLocked) onOpen();
            }}
        >
            {/* Header / Badge */}
            <div className={styles.cardHeader}>
                {isLocked && unlockPrompt && (
                    <span className={styles.badgeLocked}>⏳ {unlockPrompt}</span>
                )}
                {isLocked && !unlockPrompt && (
                    <span className={styles.badgeLocked}>🔐 Aún no es el momento...</span>
                )}
                {isDestructing && (
                    <span className={styles.badgeDestructible}>💥 ¡Destrucción en progreso!</span>
                )}
                {isUnlocked && (
                    <span className={styles.badgeOpen}>✨ ¡Lista!</span>
                )}
            </div>

            {/* Icon */}
            <div className={`${styles.iconWrapper} ${isLocked ? styles.iconGray : styles.iconMint}`}>
                <Icon />
            </div>

            {/* Content Título o Teaser */}
            <p className={isLocked ? styles.teaserDimmed : styles.teaser}>
                {isLocked ? teaserMessage : title || teaserMessage}
            </p>

            {/* Dominios para links */}
            {type === 'link' && domain && (
                <span className={styles.domainPill}>{domain}</span>
            )}

            {/* Acciones */}
            {isUnlocked && (
                <button className={styles.openBtn}>
                    Toca para abrir 👆
                </button>
            )}
        </motion.div>
    );
}



/**
 * DestructModal — Pantalla de advertencia crítica con countdown
 */
function DestructModal({ files, onDownload, onSkip, onTimeUp }) {
    const [seconds, setSeconds] = useState(30);
    const [glow, setGlow] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setGlow(prev => !prev);
        }, 1500);

        timerRef.current = setInterval(() => {
            setSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    clearInterval(interval);
                    onTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            clearInterval(interval);
        };
    }, [onTimeUp]);

    return createPortal(
        <div className={styles.destructOverlay}>
            <motion.div 
                className={styles.destructCard}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 20 }}
            >
                <div className={styles.destructIcon}>💥</div>
                <h2 className={styles.destructTitle}>Esta cápsula se autodestruirá</h2>
                
                <div className={styles.countdownContainer}>
                    <motion.span 
                        key={seconds}
                        initial={{ scale: 1.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={styles.countdownNumber}
                    >
                        {seconds}
                    </motion.span>
                </div>

                <p className={styles.destructText}>
                    ¿Quieres descargar los archivos antes de que desaparezcan para siempre?
                </p>

                <div className={styles.destructActions}>
                    <Button 
                        variant="primary" 
                        fullWidth 
                        onClick={onDownload}
                    >
                        💾 Descargar todo
                    </Button>
                    <Button 
                        variant="ghost" 
                        fullWidth 
                        onClick={onSkip}
                    >
                        No, destruir
                    </Button>
                </div>
            </motion.div>
        </div>,
        document.body
    );
}
