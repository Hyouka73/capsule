import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button/Button';
import SegmentedControl from '../../components/ui/SegmentedControl/SegmentedControl';
import styles from './UserCoupons.module.css';
import CouponTicket from '../../components/ui/CouponTicket/CouponTicket';
import BottomSheetModal from '../../components/ui/BottomSheetModal/BottomSheetModal';

// Mock data
const MOCK_COUPONS = [
    {
        id: '1',
        title: 'Noche de Películas',
        description: 'Tú eliges la peli, yo pongo las palomitas y los abrazos.',
        type: 'date_night',
        emoji: '🍿',
        isUsed: false,
    },
    {
        id: '2',
        title: 'Masaje de 30 min',
        description: 'Válido para un masaje relajante en la zona que prefieras.',
        type: 'massage',
        emoji: '💆‍♀️',
        isUsed: false,
    },
    {
        id: '3',
        title: 'Pizza Night',
        description: 'Cena de pizza casera o de tu lugar favorito, ¡yo invito!',
        type: 'food',
        emoji: '🍕',
        isUsed: false,
    },
    {
        id: '4',
        title: 'Desayuno en la cama',
        description: 'Día libre de cocinar. Te llevo tu desayuno favorito.',
        type: 'favor',
        emoji: '🥞',
        isUsed: true,
        usedAt: new Date(Date.now() - 345600000).toISOString(),
    }
];

export default function UserCoupons({ onModalStateChange }) {
    const [activeTab, setActiveTab] = useState('available');
    const [previousTab, setPreviousTab] = useState('available');
    const [coupons, setCoupons] = useState(MOCK_COUPONS);
    const [redeemingCoupon, setRedeemingCoupon] = useState(null);

    const available = coupons.filter(c => !c.isUsed);
    const used = coupons.filter(c => c.isUsed);

    const handleTabChange = (newTab) => {
        setPreviousTab(activeTab);
        setActiveTab(newTab);
    };

    const handleRedeem = (e) => {
        e.preventDefault();
        setCoupons(prev => prev.map(c =>
            c.id === redeemingCoupon.id
                ? { ...c, isUsed: true, usedAt: new Date().toISOString() }
                : c
        ));
        setRedeemingCoupon(null);
        if (onModalStateChange) onModalStateChange(false);
        // Aquí se llamaría a usePastelToast (si estuviéramos en ese nivel de hook)
    };

    const handleCloseModal = () => {
        setRedeemingCoupon(null);
        if (onModalStateChange) onModalStateChange(false);
    };

    const handleOpenModal = (coupon) => {
        setRedeemingCoupon(coupon);
        if (onModalStateChange) onModalStateChange(true);
    };

    return (
        <div className={styles.root}>
            <SegmentedControl
                tabs={[
                    { id: 'available', label: `Disponibles (${available.length})` },
                    { id: 'used', label: `Cobrados (${used.length})` }
                ]}
                activeTab={activeTab}
                onChange={handleTabChange}
            />

            <div className={styles.couponList} style={{ minHeight: '300px' }}>
                <AnimatePresence mode="popLayout" custom={activeTab === 'available' ? -1 : 1}>
                    <motion.div
                        key={activeTab}
                        custom={activeTab === 'available' ? -1 : 1}
                        initial={(direction) => ({ x: direction * 100, opacity: 0 })}
                        animate={{ x: 0, opacity: 1 }}
                        exit={(direction) => ({ x: direction * -100, opacity: 0 })}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                    >
                        {(activeTab === 'available' ? available : used).map(coupon => (
                            <CouponTicket
                                key={coupon.id}
                                coupon={coupon}
                                onRedeem={handleOpenModal}
                            />
                        ))}

                        {(activeTab === 'available' && available.length === 0) && (
                            <p className={styles.emptyState}>No tienes caprichos nuevos por ahora.</p>
                        )}
                        {(activeTab === 'used' && used.length === 0) && (
                            <p className={styles.emptyState}>Aún no has cobrado ningún capricho.</p>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            <BottomSheetModal
                isOpen={!!redeemingCoupon}
                onClose={handleCloseModal}
                emoji={redeemingCoupon?.emoji}
                title={redeemingCoupon?.title}
                description="¿Segura que quieres cobrarlo ahora?"
                confirmText="Sí, lo cobro 💝"
                cancelText="Mejor después"
                onConfirm={handleRedeem}
                onCancel={handleCloseModal}
            />
        </div>
    );
}
