import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button/Button';
import SegmentedControl from '../../components/ui/SegmentedControl/SegmentedControl';
import styles from './UserCoupons.module.css';
import CouponTicket from '../../components/ui/CouponTicket/CouponTicket';
import BottomSheetModal from '../../components/ui/BottomSheetModal/BottomSheetModal';

import { MOCK_COUPONS } from '../../data/couponsData';

import { useCoupons } from '../../hooks/useCoupons';

export default function UserCoupons({ onModalStateChange }) {
    const [activeTab, setActiveTab] = useState('available');
    const { coupons, redemptions, isLoading, redeemCoupon, claimRedemption } = useCoupons();
    const [actionCoupon, setActionCoupon] = useState(null);
    const [actionType, setActionType] = useState('redeem'); // 'redeem' or 'claim'

    // Logic:
    // 1. Available: All active coupons (Pool) + redemptions with status 'assigned'
    // 2. Pending: Redemptions with status 'pending_approval' or 'approved'/'pending_claim'
    // 3. Claimed: Redemptions with status 'claimed'

    const available = [
        ...(coupons || []).filter(c => c.status === 'activo' && (c.redemptionsLeft === undefined || c.redemptionsLeft > 0)),
        ...(redemptions || []).filter(r => r.status === 'assigned').map(r => {
            const coupon = coupons.find(c => c.id === r.couponId);
            return { ...coupon, id: r.couponId, redemptionId: r.id, isAssigned: true };
        })
    ].filter(item => item.id); // Ensure we have a valid coupon object

    const pending = (redemptions || []).filter(r => r.status === 'pending_approval' || r.status === 'approved' || r.status === 'pending_claim').map(r => {
        const coupon = coupons.find(c => c.id === r.couponId);
        return { ...coupon, id: r.couponId, redemptionId: r.id, redemptionStatus: r.status };
    }).filter(item => item.id);

    const claimed = (redemptions || []).filter(r => r.status === 'claimed').map(r => {
        const coupon = coupons.find(c => c.id === r.couponId);
        return { ...coupon, id: r.couponId, redemptionId: r.id };
    }).filter(item => item.id);

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
    };

    const handleConfirmAction = async () => {
        if (!actionCoupon) return;

        let res;
        if (actionType === 'redeem') {
            res = await redeemCoupon(actionCoupon.id);
        } else {
            res = await claimRedemption(actionCoupon.redemptionId);
        }

        if (res.success) {
            setActionCoupon(null);
            if (onModalStateChange) onModalStateChange(false);
        }
    };

    const handleCloseModal = () => {
        setActionCoupon(null);
        if (onModalStateChange) onModalStateChange(false);
    };

    const openRedeemModal = (coupon) => {
        setActionType('redeem');
        setActionCoupon(coupon);
        if (onModalStateChange) onModalStateChange(true);
    };

    const openClaimModal = (coupon) => {
        setActionType('claim');
        setActionCoupon(coupon);
        if (onModalStateChange) onModalStateChange(true);
    };

    if (isLoading && coupons.length === 0) {
        return (
            <div className={styles.root}>
                <div className={styles.loading}>Sincronizando tus cupones... ✨</div>
            </div>
        );
    }

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <h1 className={styles.title}>Cupones 🎁</h1>
                <p className={styles.subtitle}>Detalles especiales para canjear y disfrutar.</p>
            </div>
            
            <SegmentedControl
                tabs={[
                    { id: 'available', label: `Disponibles (${available.length})` },
                    { id: 'pending', label: `Pendientes (${pending.length})` },
                    { id: 'claimed', label: `Cobrados (${claimed.length})` }
                ]}
                activeTab={activeTab}
                onChange={handleTabChange}
            />

            <div className={styles.couponList}>
                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={styles.gridContainer}
                    >
                        {activeTab === 'available' && available.map(coupon => (
                            <CouponTicket
                                key={coupon.redemptionId || coupon.id}
                                coupon={coupon}
                                onRedeem={() => openRedeemModal(coupon)}
                            />
                        ))}

                        {activeTab === 'pending' && pending.map(coupon => (
                            <CouponTicket
                                key={coupon.redemptionId}
                                coupon={{ ...coupon, isPending: true }}
                                onRedeem={() => coupon.redemptionStatus !== 'pending_approval' && openClaimModal(coupon)}
                            />
                        ))}

                        {activeTab === 'claimed' && claimed.map(coupon => (
                            <CouponTicket
                                key={coupon.redemptionId}
                                coupon={{ ...coupon, isUsed: true }}
                            />
                        ))}

                        {(activeTab === 'available' && available.length === 0) && (
                            <p className={styles.emptyState}>No tienes caprichos nuevos por ahora.</p>
                        )}
                        {(activeTab === 'pending' && pending.length === 0) && (
                            <p className={styles.emptyState}>No hay canjes esperando aprobación.</p>
                        )}
                        {(activeTab === 'claimed' && claimed.length === 0) && (
                            <p className={styles.emptyState}>Aún no has cobrado ningún capricho.</p>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            <BottomSheetModal
                isOpen={!!actionCoupon}
                onClose={handleCloseModal}
                emoji={actionCoupon?.emoji}
                title={actionCoupon?.title || actionCoupon?.name}
                description={actionType === 'redeem' ? "¿Segura que quieres solicitar este vale?" : "¿Ya recibiste tu regalo? Esto lo marcará como cobrado definitivamente."}
                confirmText={actionType === 'redeem' ? "¡Sí, por favor! 💝" : "¡Sí, lo cobré! ✅"}
                cancelText="Mejor después"
                onConfirm={handleConfirmAction}
                onCancel={handleCloseModal}
            />
        </div>
    );
}
