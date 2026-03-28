import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './UserCapsules.module.css';
import { CapsuleIcons } from '../../icons/CapsuleIcons';
import { getCapsules, openCapsule, deleteCapsule } from '../../apiClient';
import Button from '../../components/ui/Button/Button';

/**
 * Normaliza los campos raw de Firestore a los campos derivados que espera la UI.
 */
function normalizeCapsule(raw) {
    const now = Date.now();
    const opensAtRaw = raw.unlockDate || raw.opensAt;
    const opensAt = opensAtRaw ? new Date(opensAtRaw).getTime() : null;

    let status = raw.status || 'locked';
    
    // Fallback logic if status is missing or needs derivation
    if (!raw.status) {
        if (raw.isUnlocked) {
            status = 'unlocked';
        } else if (opensAt && opensAt > now) {
            status = 'locked';
        }
    }

    const opensInDays = opensAt ? Math.ceil((opensAt - now) / 86400000) : null;

    return {
        ...raw,
        status,
        autoDestroy: !!(raw.autoDestroy || raw.autoDestruct),
        type: raw.type || 'standard',
        opensInDays,
        destroyedAt: raw.destroyedAt ? new Date(raw.destroyedAt).getTime() : null,
    };
}

/**
 * UserCapsules — Vista de Cápsulas del Tiempo (Buzón)
 * Rediseñado con tokens y lógica de estados (locked, unlocked, destructible).
 */
export default function UserCapsules() {
    const [capsules, setCapsules] = useState([]);
    const [activeTab, setActiveTab] = useState('unopened'); // 'unopened' | 'opened'
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCapsule, setSelectedCapsule] = useState(null);
    const [showDestruct, setShowDestruct] = useState(false);
    const isMounted = useRef(true);
    const hasOpenedRef = useRef(new Set()); 

    const fetchCapsules = useCallback(async () => {
        try {
            const res = await getCapsules({});
            if (!isMounted.current) return;
            const normalized = (res.docs || []).map(normalizeCapsule);
            setCapsules(normalized.filter(c => c.status !== 'destroyed'));
        } catch {
            // Silently fail in prod
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        fetchCapsules();
    }, [fetchCapsules]);

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
        // Si ya está abierta o en espera de destrucción, solo mostrar
        if (capsule.status === 'opened' || capsule.status === 'pending_destruction') {
            setSelectedCapsule(capsule);
            return;
        }

        try {
            const res = await openCapsule({ capsuleId: capsule.id });
            if (!isMounted.current) return;
            if (res.success) {
                const updatedCapsule = normalizeCapsule(res.capsule);
                setSelectedCapsule(updatedCapsule);
            }
        } catch {
            // Silently fail in prod
        }
    };

    const handleFinalClose = async () => {
        setSelectedCapsule(null);
        setShowDestruct(false);
        if (isMounted.current) fetchCapsules();
    };

    const handleDestroy = async () => {
        if (!selectedCapsule) return;
        try {
            await deleteCapsule({ capsuleId: selectedCapsule.id });
        } catch (err) {
            // Silently fail in prod
        } finally {
            if (isMounted.current) handleFinalClose();
        }
    };

    const handleToggleModal = (capsule) => {
        if (!capsule) {
            // Case: Closing from the content modal
            if (selectedCapsule?.autoDestroy && selectedCapsule.status !== 'pending_destruction') {
                setShowDestruct(true);
            } else {
                handleFinalClose();
            }
        } else {
            handleOpenCapsule(capsule);
        }
    };

    const filteredCapsules = capsules.filter(c => {
        if (activeTab === 'unopened') return c.status === 'locked' || c.status === 'unlocked' || c.status === 'pending_destruction';
        if (activeTab === 'opened') return c.status === 'opened';
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
                    <CapsuleModal
                        capsule={selectedCapsule}
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
    const { status, type, teaserMessage, title, opensInDays, destroysInHours, domain } = capsule;

    const isLocked = status === 'locked';
    const isDestructing = status === 'pending_destruction';
    const isUnlocked = status === 'unlocked' || status === 'opened';

    // Icono dinámico desde el módulo externo
    const Icon = CapsuleIcons[type] || CapsuleIcons['message'];

    const getCardClass = () => {
        if (isLocked) return styles.cardLocked;
        if (isDestructing) return styles.cardDestructible;
        return styles.cardUnlocked;
    };

    return (
        <motion.div
            whileHover={!isLocked ? { scale: 1.02 } : {}}
            whileTap={!isLocked ? { scale: 0.98 } : {}}
            className={`${styles.card} ${getCardClass()}`}
            onClick={() => {
                if (!isLocked) onOpen();
            }}
        >
            {/* Header / Badge */}
            <div className={styles.cardHeader}>
                {isLocked && (
                    <span className={styles.badgeLocked}>⏳ Se abre en {opensInDays} días</span>
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

function CapsuleModal({ capsule, onClose }) {
    const { type, status, message, files, links } = capsule;
    const Icon = CapsuleIcons[type] || CapsuleIcons['message'];

    // Variants for sequenced reveal
    const bodyVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.15, delayChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: { 
            opacity: 1, y: 0, scale: 1,
            transition: { type: 'spring', damping: 20, stiffness: 200 }
        }
    };

    const iconVariants = {
        hidden: { scale: 0, rotate: -20 },
        visible: { 
            scale: 1, rotate: 0,
            transition: { type: 'spring', damping: 15, stiffness: 300, delay: 0.1 }
        }
    };

    return (
        <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className={styles.modalContent}
                initial={{ scale: 0.9, y: 50, rotate: -2 }}
                animate={{ scale: 1, y: 0, rotate: 0 }}
                exit={{ scale: 0.9, y: 50, rotate: 2 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
            >
                <button className={styles.closeBtn} onClick={onClose}>×</button>
                
                <motion.div 
                    className={styles.modalBody}
                    variants={bodyVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.div className={styles.modalIconLarge} variants={iconVariants}>
                        <Icon />
                    </motion.div>

                    {message && (
                        <motion.div className={styles.modalMessage} variants={itemVariants}>
                            {message}
                        </motion.div>
                    )}

                    {files && files.length > 0 && (
                        <motion.div style={{ width: '100%' }} variants={itemVariants}>
                            <p className={styles.sectionTitle}>Archivos adjuntos</p>
                            <div className={styles.contentList}>
                                {files.map((file, idx) => (
                                    <a 
                                        key={idx} 
                                        href={file.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className={styles.contentLink}
                                    >
                                        <span className={styles.linkIcon}>📎</span>
                                        {file.fileName || file.name || 'Descargar archivo'}
                                    </a>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {links && links.length > 0 && (
                        <motion.div style={{ width: '100%' }} variants={itemVariants}>
                            <p className={styles.sectionTitle}>Links compartidos</p>
                            <div className={styles.contentList}>
                                {links.map((link, idx) => (
                                    <a 
                                        key={idx} 
                                        href={link.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className={styles.contentLink}
                                    >
                                        <span className={styles.linkIcon}>🔗</span>
                                        {link.title || link.url}
                                    </a>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {status === 'pending_destruction' && (
                        <motion.div 
                            variants={itemVariants}
                            style={{ marginTop: '1rem', color: 'var(--color-error)', fontWeight: '800', fontSize: '0.8rem', textTransform: 'uppercase' }}
                        >
                            ⚠️ Esta cápsula se autodestruirá pronto (Ventana de 24h)
                        </motion.div>
                    )}
                </motion.div>
            </motion.div>
        </motion.div>
    );
}

/**
 * DestructModal — Pantalla de advertencia crítica con countdown
 */
function DestructModal({ files, onDownload, onSkip, onTimeUp }) {
    const [seconds, setSeconds] = useState(30);
    const timerRef = useRef(null);

    useEffect(() => {
        timerRef.current = setInterval(() => {
            setSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    onTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
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
