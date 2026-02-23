import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './UserCapsules.module.css';
import { CapsuleIcons } from '../../icons/CapsuleIcons';
import { MOCK_CAPSULES } from '../../data/capsulesData';

/**
 * UserCapsules — Vista de Cápsulas del Tiempo (Buzón)
 * Rediseñado con tokens y lógica de estados (locked, unlocked, destructible).
 */
export default function UserCapsules() {
    const [selectedCapsule, setSelectedCapsule] = useState(null);

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <h1 className={styles.title}>Buzón del Tiempo</h1>
                <p className={styles.subtitle}>7 sorpresas listas para ti</p>
            </div>

            <div className={styles.grid}>
                {MOCK_CAPSULES.map(capsule => (
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
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
            >
                <button className={styles.closeBtn} onClick={onClose}>×</button>
                <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                    Cerrar para volver
                </h2>
                <div style={{ marginTop: '2rem', color: 'var(--text-muted)' }}>
                    <p>Contenido tipo: {capsule.type}</p>
                    {capsule.status === 'destructible' && (
                        <p style={{ color: 'var(--color-error)', fontWeight: 'bold' }}>
                            ¡Este mensaje se autodestruirá!
                        </p>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
