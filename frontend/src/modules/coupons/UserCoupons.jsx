import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button/Button';
import SegmentedControl from '../../components/ui/SegmentedControl/SegmentedControl';
import styles from './UserCoupons.module.css';
import CouponTicket from '../../components/ui/CouponTicket/CouponTicket';
import BottomSheetModal from '../../components/ui/BottomSheetModal/BottomSheetModal';

import { MOCK_COUPONS } from '../../data/couponsData';

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
            <div className={styles.header}>
                <h1 className={styles.title}>Cupones</h1>
                <p className={styles.subtitle}>Detalles especiales para canjear.</p>
            </div>
            <SegmentedControl
                tabs={[
                    { id: 'available', label: `Disponibles (${available.length})` },
                    { id: 'used', label: `Cobrados (${used.length})` }
                ]}
                activeTab={activeTab}
                onChange={handleTabChange}
            />

            <div className={styles.couponList}>
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
