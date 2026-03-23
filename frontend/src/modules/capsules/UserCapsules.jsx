import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './UserCapsules.module.css';
import { CapsuleIcons } from '../../icons/CapsuleIcons';
import { getCapsules, openCapsule } from '../../apiClient';
import Button from '../../components/ui/Button/Button';

/**
 * Normaliza los campos raw de Firestore a los campos derivados que espera la UI.
 */
function normalizeCapsule(raw) {
    const now = Date.now();
    const opensAtRaw = raw.unlockDate || raw.opensAt;
    const opensAt = opensAtRaw ? new Date(opensAtRaw).getTime() : null;
    const destructsAtRaw = raw.destructAt || raw.destructsAt;
    const destructsAt = destructsAtRaw ? new Date(destructsAtRaw).getTime() : null;

    let status = 'locked';
    if (raw.isDestructed) status = 'destructed';
    else if (raw.isUnlocked) {
        status = (raw.isDestructible || destructsAt) ? 'destructible' : 'unlocked';
    }
    else if (opensAt && opensAt > now) status = 'scheduled';

    const opensInDays = opensAt ? Math.ceil((opensAt - now) / 86400000) : null;
    const destroysInHours = destructsAt ? Math.ceil((destructsAt - now) / 3600000) : null;

    return {
        ...raw,
        status,
        type: raw.type || 'standard',
        opensInDays,
        destroysInHours,
        domain: raw.domain || null,
    };
}

/**
 * UserCapsules — Vista de Cápsulas del Tiempo (Buzón)
 * Rediseñado con tokens y lógica de estados (locked, unlocked, destructible).
 */
export default function UserCapsules() {
    const [capsules, setCapsules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCapsule, setSelectedCapsule] = useState(null);
    const [showDestruct, setShowDestruct] = useState(false);
    const hasOpenedRef = useRef(new Set()); // Track which capsules were marked as opened/viewed

    useEffect(() => {
        getCapsules({})
            .then(res => {
                const normalized = (res.docs || []).map(normalizeCapsule);
                setCapsules(normalized);
            })
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }, []);

    const handleDownloadFiles = (files) => {
        if (!files || files.length === 0) return;
        files.forEach(file => {
            const a = document.createElement('a');
            a.href = file.url;
            a.download = file.fileName || 'capsule-file';
            a.target = '_blank'; // Previene bloqueos en algunos navegadores
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    };

    const handleFinalClose = async (capsuleId) => {
        // Only trigger backend open once per session/view
        if (!hasOpenedRef.current.has(capsuleId)) {
            try {
                await openCapsule({ capsuleId });
                hasOpenedRef.current.add(capsuleId);
            } catch (err) {
                console.error('[UserCapsules] Error marking capsule as opened:', err);
            }
        }
        
        setSelectedCapsule(null);
        setShowDestruct(false);
        
        // Refresh list to show 'destructed' state
        const res = await getCapsules({});
        setCapsules((res.docs || []).map(normalizeCapsule));
    };

    const handleToggleModal = (capsule) => {
        if (!capsule) {
            // Case: Closing from the content modal (X button)
            if (selectedCapsule?.autoDestruct && selectedCapsule?.files?.length > 0) {
                setShowDestruct(true);
            } else {
                handleFinalClose(selectedCapsule?.id);
            }
        } else {
            setSelectedCapsule(capsule);
        }
    };

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
                <p className={styles.subtitle}>{capsules.length} sorpresas listas para ti</p>
            </div>

            <div className={styles.grid}>
                {capsules.map(capsule => (
                    <CapsuleCard
                        key={capsule.id}
                        capsule={capsule}
                        onOpen={() => setSelectedCapsule(capsule)}
                    />
                ))}
            </div>

            <AnimatePresence>
                {selectedCapsule && !showDestruct && selectedCapsule.status !== 'locked' && (
                    <CapsuleModal
                        capsule={selectedCapsule}
                        onClose={() => handleToggleModal(null)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showDestruct && (
                    <DestructModal
                        files={selectedCapsule?.content?.files || []}
                        onDownload={() => {
                            handleDownloadFiles(selectedCapsule.content.files);
                            handleFinalClose(selectedCapsule.id);
                        }}
                        onSkip={() => handleFinalClose(selectedCapsule.id)}
                        onTimeUp={() => handleFinalClose(selectedCapsule.id)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function CapsuleCard({ capsule, onOpen }) {
    const { status, type, teaserMessage, title, opensInDays, destroysInHours, domain } = capsule;

    const isLocked = status === 'locked';
    const isDestructible = status === 'destructible';
    const isUnlocked = status === 'unlocked';

    // Icono dinámico desde el módulo externo
    const Icon = CapsuleIcons[type] || CapsuleIcons['message'];

    const getCardClass = () => {
        if (isLocked) return styles.cardLocked;
        if (isDestructible) return styles.cardDestructible;
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
                {isUnlocked && (
                    <span className={styles.badgeOpen}>✨ ¡Lista!</span>
                )}
            </div>

            {/* Icon */}
            <div className={`${styles.iconWrapper} ${isLocked ? styles.iconGray : styles.iconMint}`}>
                <Icon />
            </div>

            {/* Content Título o Teaser */}
            {isDestructible ? (
                <>
                    <p className={styles.contentTitle}>{title}</p>
                    <div className={styles.destructionBar}>
                        <p className={styles.destructionText}>💥 SE DESTRUYE EN {destroysInHours} HORAS</p>
                        <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: '60%' }}></div>
                        </div>
                    </div>
                </>
            ) : (
                <p className={isLocked ? styles.teaserDimmed : styles.teaser}>
                    "{teaserMessage}"
                </p>
            )}

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

                    {status === 'destructible' && (
                        <motion.div 
                            variants={itemVariants}
                            style={{ marginTop: '1rem', color: 'var(--color-error)', fontWeight: '800', fontSize: '0.8rem', textTransform: 'uppercase' }}
                        >
                            ⚠️ Esta cápsula se autodestruirá pronto
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
    const [seconds, setSeconds] = useState(10);
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
