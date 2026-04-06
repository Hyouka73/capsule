import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button/Button';
import SegmentedControl from '../../components/ui/SegmentedControl/SegmentedControl';
import styles from './UserCoupons.module.css';
import CouponTicket from '../../components/ui/CouponTicket/CouponTicket';
import BottomSheetModal from '../../components/ui/BottomSheetModal/BottomSheetModal';

import { MOCK_COUPONS } from '../../data/couponsData';

import KawaiiInput from '../../components/ui/KawaiiInput/KawaiiInput';
import { toast } from '../../components/ui/PastelToast/PastelToast';

import { useCoupons } from '../../hooks/useCoupons';

export default function UserCoupons({ onModalStateChange }) {
    const [activeTab, setActiveTab] = useState('available');
    const { coupons, redemptions, isLoading, redeemCoupon, claimRedemption, dismissRedemption } = useCoupons();
    const [actionCoupon, setActionCoupon] = useState(null);
    const [actionType, setActionType] = useState('redeem'); // 'redeem' or 'claim'
    const [customWish, setCustomWish] = useState('');

    // Logic:
    // 1. Available: All active coupons (Pool) + redemptions with status 'assigned'
    // 2. Pending: Redemptions with status 'pending_approval' or 'approved'/'pending_claim'
    // 3. Claimed: Redemptions with status 'claimed'

    const pending = (redemptions || []).filter(r => ['pending_approval', 'approved', 'pending_claim', 'postponed'].includes(r.status)).map(r => {
        const coupon = coupons.find(c => c.id === r.couponId);
        return { ...coupon, id: r.couponId, redemptionId: r.id, redemptionStatus: r.status, adminNote: r.adminNote || '' };
    }).filter(item => item.id);

    const available = [
        // Only coupons explicitly assigned to the partner
        ...(coupons || []).filter(c => c.assignedTo === 'partner' && c.status === 'active').map(c => ({
            ...c,
            isAssigned: true
        })),
        // Legacy/Redemption-based assignments
        ...(redemptions || []).filter(r => r.status === 'assigned').map(r => {
            const coupon = coupons.find(c => c.id === r.couponId);
            return { ...coupon, id: r.couponId, redemptionId: r.id, isAssigned: true };
        })
    ].filter((item, index, self) => {
        // 1. Ensure valid ID
        if (!item.id) return false;
        // 2. Remove duplicates
        if (self.findIndex(t => t.id === item.id) !== index) return false;
        // 3. Remove if it's already in pending (so it doesn't duplicate)
        if (pending.some(p => p.id === item.id)) return false;
        return true;
    });

    const claimed = (redemptions || []).filter(r => r.status === 'claimed').map(r => {
        const coupon = coupons.find(c => c.id === r.couponId);
        return { ...coupon, id: r.couponId, redemptionId: r.id };
    }).filter(item => item.id);

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
    };

    const handleConfirmAction = async () => {
        if (!actionCoupon) return;

        const isDiamond = actionCoupon.tier === 4 || actionCoupon.type === 'diamond';
        
        if (actionType === 'redeem' && isDiamond && !customWish.trim()) {
            toast.error('Debes escribir tu deseo antes de usar este cupón Diamante. 💎');
            return;
        }

        let res;
        if (actionType === 'redeem') {
            res = await redeemCoupon(actionCoupon.id, isDiamond ? customWish : '');
        } else {
            res = await claimRedemption(actionCoupon.redemptionId);
        }

        if (res.success) {
            setActionCoupon(null);
            setCustomWish('');
            if (onModalStateChange) onModalStateChange(false);
        }
    };

    const handleCloseModal = () => {
        setActionCoupon(null);
        setCustomWish('');
        if (onModalStateChange) onModalStateChange(false);
    };

    const openRedeemModal = (coupon) => {
        setActionType('redeem');
        setActionCoupon(coupon);
        setCustomWish('');
        if (onModalStateChange) onModalStateChange(true);
    };

    const openClaimModal = (coupon) => {
        setActionType('claim');
        setActionCoupon(coupon);
        if (onModalStateChange) onModalStateChange(true);
    };

    const handleDismissPostponed = async (coupon) => {
        await dismissRedemption(coupon.redemptionId);
        // Coupon will re-appear in available since it's still assigned
    };

    if (isLoading && coupons.length === 0) {
        return (
            <div className={styles.root}>
                <div className={styles.loading}>Sincronizando tus cupones... ✨</div>
            </div>
        );
    }

    const isDiamondAction = actionCoupon && (actionCoupon.tier === 4 || actionCoupon.type === 'diamond');

    return (
        <div className={styles.root}>

            
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
                                coupon={{ 
                                    ...coupon, 
                                    isPending: coupon.redemptionStatus === 'pending_approval',
                                    isApproved: coupon.redemptionStatus === 'approved',
                                    isPostponed: coupon.redemptionStatus === 'postponed',
                                    adminNote: coupon.adminNote
                                }}
                                onRedeem={
                                    coupon.redemptionStatus === 'approved'
                                        ? () => openClaimModal(coupon)
                                        : coupon.redemptionStatus === 'postponed'
                                            ? () => handleDismissPostponed(coupon)
                                            : undefined
                                }
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
                emoji={isDiamondAction ? '💎' : actionCoupon?.emoji}
                title={actionCoupon?.title || actionCoupon?.name}
                description={
                    isDiamondAction && actionType === 'redeem'
                    ? "Este es un pase VIP Diamante. Pide lo que quieras."
                    : actionType === 'redeem' ? "¿Segura que quieres solicitar este vale?" : "¿Ya recibiste tu regalo? Esto lo marcará como cobrado definitivamente."
                }
                confirmText={isDiamondAction && actionType === 'redeem' ? "Solicitar Deseo 💎" : actionType === 'redeem' ? "¡Sí, por favor! 💝" : "¡Sí, lo cobré! ✅"}
                cancelText="Mejor después"
                onConfirm={handleConfirmAction}
                onCancel={handleCloseModal}
            >
                {isDiamondAction && actionType === 'redeem' && (
                    <div style={{ marginTop: '1rem' }}>
                        <KawaiiInput
                            type="textarea"
                            label="Escribe aquí tu deseo (Límite: tu imaginación)"
                            required
                            rows="4"
                            placeholder="Tus deseos son órdenes..."
                            value={customWish}
                            onChange={(e) => setCustomWish(e.target.value)}
                        />
                    </div>
                )}
            </BottomSheetModal>
        </div>
    );
}
