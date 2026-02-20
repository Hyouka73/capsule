import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button/Button';
import styles from './UserCapsules.module.css';

// Mock data para desarrollo de la UI sin backend
const MOCK_CAPSULES = [
    {
        id: '1',
        teaserMessage: 'Una pequeña sorpresa para empezar la semana 💖',
        teaserIcon: '💌',
        isUnlocked: false,
        unlockDate: new Date(Date.now() + 86400000).toISOString(), // Mañana
        type: 'message'
    },
    {
        id: '2',
        teaserMessage: 'Feliz Aniversario mi amor',
        teaserIcon: '🎁',
        isUnlocked: true,
        unlockedAt: new Date(Date.now() - 172800000).toISOString(), // Hace 2 días
        type: 'photo',
        content: {
            url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80',
            caption: 'Nuestro primer viaje juntos. Te amo más cada día.',
            text: ''
        }
    },
    {
        id: '3',
        teaserMessage: 'Cuando te sientas triste, abre esto',
        teaserIcon: '🧸',
        isUnlocked: true,
        unlockedAt: new Date(Date.now() - 500000000).toISOString(),
        type: 'message',
        content: {
            text: 'Eres la persona más fuerte y hermosa que conozco. Siempre estaré a tu lado para sostenerte, incluso a la distancia.',
            fontStyle: 'handwritten'
        }
    }
];

export default function UserCapsules() {
    const [selectedCapsule, setSelectedCapsule] = useState(null);

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <h1 className={styles.title}>Buzón del Tiempo</h1>
                <p className={styles.subtitle}>Momentos guardados especialmente para ti.</p>
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
                {selectedCapsule?.isUnlocked && (
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
    const isLocked = !capsule.isUnlocked;

    // Calcular tiempo faltante de forma básica para la demo
    const renderStatus = () => {
        if (!isLocked) return <span className={styles.badgeOpen}>✨ Lista para abrir</span>;

        const date = new Date(capsule.unlockDate);
        return (
            <span className={styles.badgeLocked}>
                ⏱️ Se abre el {date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </span>
        );
    };

    return (
        <motion.div
            whileHover={!isLocked ? { scale: 1.02 } : {}}
            whileTap={!isLocked ? { scale: 0.98 } : {}}
            className={`${styles.card} ${isLocked ? styles.cardLocked : styles.cardUnlocked}`}
            onClick={() => {
                if (!isLocked) onOpen();
            }}
        >
            <div className={styles.cardHeader}>
                {renderStatus()}
            </div>

            <div className={styles.iconWrapper}>
                <span className={isLocked ? styles.iconFloating : styles.iconGlowing}>
                    {capsule.teaserIcon || (isLocked ? '🔒' : '💌')}
                </span>
            </div>

            <p className={styles.teaser}>{capsule.teaserMessage}</p>

            {!isLocked && (
                <div className={styles.openHint}>Toca para abrir</div>
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

                <div className={styles.modalScroll}>
                    {capsule.type === 'photo' && capsule.content?.url && (
                        <div className={styles.photoWrapper}>
                            <img src={capsule.content.url} alt="Recuerdo" className={styles.photo} />
                            {capsule.content.caption && (
                                <p className={styles.caption}>{capsule.content.caption}</p>
                            )}
                        </div>
                    )}

                    {capsule.type === 'message' && capsule.content?.text && (
                        <div className={`${styles.messageWrapper} ${capsule.content.fontStyle === 'handwritten' ? styles.handwritten : ''}`}>
                            <p>{capsule.content.text}</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
