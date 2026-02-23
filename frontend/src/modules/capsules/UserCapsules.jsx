import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button/Button';
import styles from './UserCapsules.module.css';

// 7 tipos de contenido
const MOCK_CAPSULES = [
    {
        id: '1',
        teaserMessage: 'Palabras del corazón...',
        type: 'gift', // Especial para el locked del diseño
        status: 'locked',
        opensInDays: 3
    },
    {
        id: '2',
        teaserMessage: 'Un recuerdo congelado...',
        type: 'photo',
        status: 'unlocked',
        content: { text: 'Nuestra primera foto' }
    },
    {
        id: '3',
        title: 'Nuestra primera cita',
        type: 'video',
        status: 'destructible',
        destroysInHours: 5,
        content: { url: 'https://example.com/video.mp4' }
    },
    {
        id: '4',
        teaserMessage: 'Escucha mi voz...',
        type: 'audio',
        status: 'unlocked',
        content: { text: 'Un mensaje de voz' }
    },
    {
        id: '5',
        teaserMessage: 'Nuestra canción especial...',
        type: 'link',
        status: 'unlocked',
        domain: 'spotify.com',
        content: { url: 'https://open.spotify.com/track/123' }
    },
    {
        id: '6',
        teaserMessage: 'Vale por un abrazo...',
        type: 'coupon',
        status: 'unlocked',
        content: { text: 'Vale por un abrazo fuerte' }
    },
    {
        id: '7',
        teaserMessage: 'Detalles importantes...',
        type: 'pdf',
        status: 'unlocked',
        content: { url: 'https://example.com/reglas.pdf' }
    },
];

// SVGS refinados para coincidir con la referencia (Outline, 56px)
const SVGS = {
    gift: () => (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 12 20 22 4 22 4 12"></polyline>
            <rect x="2" y="7" width="20" height="5"></rect>
            <line x1="12" y1="22" x2="12" y2="7"></line>
            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
        </svg>
    ),
    message: () => (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect>
            <polyline points="3 7 12 13 21 7"></polyline>
        </svg>
    ),
    photo: () => (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
    ),
    video: () => (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h20v18H2z"></path>
            <path d="M2 7h20"></path>
            <path d="m5 3 3 4"></path>
            <path d="m9 3 3 4"></path>
            <path d="m13 3 3 4"></path>
            <path d="m17 3 3 4"></path>
        </svg>
    ),
    audio: () => (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
    ),
    link: () => (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
    ),
    coupon: () => (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
            <path d="m12 15-2-1-2 1 1-2-1-1 2-1 1-2 1 2 2 1-1 1z"></path>
        </svg>
    ),
    pdf: () => (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="8" y1="13" x2="16" y2="13"></line>
            <line x1="8" y1="17" x2="16" y2="17"></line>
            <line x1="10" y1="9" x2="8" y2="9"></line>
        </svg>
    )
};

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
    const SvgIcon = SVGS[type] || SVGS['message'];

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
                {SvgIcon()}
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
