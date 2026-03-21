import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './UserCapsules.module.css';
import { CapsuleIcons } from '../../icons/CapsuleIcons';
import { getCapsules } from '../../apiClient';

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

    useEffect(() => {
        getCapsules({})
            .then(res => {
                const normalized = (res.docs || []).map(normalizeCapsule);
                setCapsules(normalized);
            })
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }, []);

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
                {selectedCapsule?.status !== 'locked' && selectedCapsule != null && (
                    <CapsuleModal
                        capsule={selectedCapsule}
                        onClose={() => setSelectedCapsule(null)}
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
    const { type, content, status } = capsule;
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

                    {content?.message && (
                        <motion.div className={styles.modalMessage} variants={itemVariants}>
                            {content.message}
                        </motion.div>
                    )}

                    {content?.files && content.files.length > 0 && (
                        <motion.div style={{ width: '100%' }} variants={itemVariants}>
                            <p className={styles.sectionTitle}>Archivos adjuntos</p>
                            <div className={styles.contentList}>
                                {content.files.map((file, idx) => (
                                    <a 
                                        key={idx} 
                                        href={file.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className={styles.contentLink}
                                    >
                                        <span className={styles.linkIcon}>📎</span>
                                        {file.name || 'Descargar archivo'}
                                    </a>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {content?.links && content.links.length > 0 && (
                        <motion.div style={{ width: '100%' }} variants={itemVariants}>
                            <p className={styles.sectionTitle}>Links compartidos</p>
                            <div className={styles.contentList}>
                                {content.links.map((link, idx) => (
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
