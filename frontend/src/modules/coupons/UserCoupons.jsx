import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button/Button';
import styles from './UserCoupons.module.css';

// Mock data
const MOCK_COUPONS = [
    {
        id: '1',
        title: 'Vale por una Noche de Películas',
        description: 'Tú eliges la peli, yo pongo las palomitas y los abrazos.',
        type: 'date_night',
        emoji: '🍿',
        isUsed: false,
    },
    {
        id: '2',
        title: 'Masaje de 30 minutos',
        description: 'Válido para un masaje relajante en la zona que prefieras.',
        type: 'massage',
        emoji: '💆‍♀️',
        isUsed: false,
    },
    {
        id: '3',
        title: 'Desayuno en la cama',
        description: 'Día libre de cocinar. Te llevo tu desayuno favorito.',
        type: 'favor',
        emoji: '🥞',
        isUsed: true,
        usedAt: new Date(Date.now() - 345600000).toISOString(),
    }
];

export default function UserCoupons() {
    const [activeTab, setActiveTab] = useState('available');
    const [coupons, setCoupons] = useState(MOCK_COUPONS);
    const [redeemingCoupon, setRedeemingCoupon] = useState(null);
    const [redeemNotes, setRedeemNotes] = useState('');

    const available = coupons.filter(c => !c.isUsed);
    const used = coupons.filter(c => c.isUsed);

    const handleRedeem = (e) => {
        e.preventDefault();
        setCoupons(prev => prev.map(c =>
            c.id === redeemingCoupon.id
                ? { ...c, isUsed: true, usedAt: new Date().toISOString() }
                : c
        ));
        setRedeemingCoupon(null);
        setRedeemNotes('');
        // Aquí se llamaría a usePastelToast (si estuviéramos en ese nivel de hook)
    };

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <h1 className={styles.title}>Talonario</h1>
                <p className={styles.subtitle}>Momentos canjeables a tu antojo.</p>
            </div>

            <div className={styles.tabsMenu}>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'available' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('available')}
                >
                    Disponibles ({available.length})
                </button>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'used' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('used')}
                >
                    Ya usados ({used.length})
                </button>
            </div>

            <div className={styles.couponList}>
                <AnimatePresence mode="popLayout">
                    {(activeTab === 'available' ? available : used).map(coupon => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            key={coupon.id}
                            className={`${styles.couponCard} ${coupon.isUsed ? styles.couponUsed : ''}`}
                        >
                            <div className={styles.couponEdgeLeft}></div>
                            <div className={styles.couponContent}>
                                <div className={styles.couponEmoji}>{coupon.emoji}</div>
                                <div className={styles.couponText}>
                                    <h3>{coupon.title}</h3>
                                    <p>{coupon.description}</p>
                                </div>
                                {!coupon.isUsed && (
                                    <button
                                        className={styles.redeemBtn}
                                        onClick={() => setRedeemingCoupon(coupon)}
                                    >
                                        Canjear
                                    </button>
                                )}
                                {coupon.isUsed && (
                                    <div className={styles.usedStamp}>
                                        CANJEADO<br />
                                        <span>{new Date(coupon.usedAt).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                            <div className={styles.couponEdgeRight}></div>
                        </motion.div>
                    ))}

                    {(activeTab === 'available' && available.length === 0) && (
                        <p className={styles.emptyState}>No tienes cupones nuevos por ahora.</p>
                    )}
                </AnimatePresence>
            </div>

            {/* Modal de Canje */}
            <AnimatePresence>
                {redeemingCoupon && (
                    <motion.div
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className={styles.modalContent}
                            initial={{ scale: 0.9, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 30 }}
                        >
                            <span className={styles.modalEmoji}>{redeemingCoupon.emoji}</span>
                            <h2>Canjear Cupón</h2>
                            <p>¿Segura que quieres usar el cupón <strong>"{redeemingCoupon.title}"</strong>?</p>

                            <form onSubmit={handleRedeem} className={styles.redeemForm}>
                                <label>Un mensaje para mí (Opcional)</label>
                                <textarea
                                    className={styles.notesInput}
                                    placeholder="Ej: Quiero cobrarlo este fin de semana amor..."
                                    value={redeemNotes}
                                    onChange={(e) => setRedeemNotes(e.target.value)}
                                    maxLength={150}
                                />

                                <div className={styles.modalActions}>
                                    <Button type="button" variant="ghost" onClick={() => setRedeemingCoupon(null)}>
                                        Mejor después
                                    </Button>
                                    <Button type="submit">Sí, ¡lo quiero!</Button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
