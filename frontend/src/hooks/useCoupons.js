import { useState, useEffect, useCallback } from 'react';
import { getCoupons, createCoupon, updateCoupon, updateRedemptionStatus, redeemCoupon } from '../apiClient';
import { useAuth } from './useAuth';
import { useOfflineActions } from './useOfflineActions';
import { toast } from '../components/ui/PastelToast/PastelToast';

export function useCoupons({ adminMode = false } = {}) {
    const { relationshipId } = useAuth();
    const { queueCoupon } = useOfflineActions();
    const [coupons, setCoupons] = useState([]);
    const [redemptions, setRedemptions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCoupons = useCallback(async () => {
        if (!relationshipId) return;
        setIsLoading(true);
        try {
            const res = await getCoupons();
            if (res.success) {
                setCoupons(res.coupons || []);
                setRedemptions(res.redemptions || []);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [relationshipId]);

    useEffect(() => {
        let isMounted = true;
        
        const load = async () => {
            if (!relationshipId) return;
            setIsLoading(true);
            try {
                const res = await getCoupons();
                if (!isMounted) return;
                if (res.success) {
                    setCoupons(res.coupons || []);
                    setRedemptions(res.redemptions || []);
                }
            } catch (err) {
                if (isMounted) setError(err.message);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        load();
        return () => { isMounted = false; };
    }, [relationshipId]);

    // Action wrappers
    const handleRedeemRequest = useCallback(async (couponId, notes = '') => {
        try {
            const res = await redeemCoupon({ couponId, notes });
            if (res.success) {
                toast.success('Solicitud enviada', 'Tu pareja recibirá la notificación.');
                fetchCoupons(); // Refresh
                return { success: true };
            }
        } catch (err) {
            toast.error('Error al enviar solicitud', err.message);
            return { success: false, error: err.message };
        }
    }, [fetchCoupons]);

    const handleUpdateStatus = useCallback(async (redemptionId, newStatus, message = '') => {
        try {
            const res = await updateRedemptionStatus({ redemptionId, newStatus, message });
            if (res.success) {
                const actionLabels = {
                    approved: 'Canje aprobado',
                    postponed: 'Canje pospuesto',
                    claimed: 'Canje completado exitosamente'
                };
                toast.success(actionLabels[newStatus] || 'Actualizado');
                fetchCoupons(); // Refresh
                return { success: true };
            }
        } catch (err) {
            toast.error('Error al actualizar estado', err.message);
            return { success: false, error: err.message };
        }
    }, [fetchCoupons]);

    const handleUpdate = useCallback(async (couponId, updateData) => {
        try {
            const res = await updateCoupon({ id: couponId, ...updateData, relationshipId });
            if (res.success || (res && typeof res.success === 'undefined')) {
                await fetchCoupons();
                return res;
            }
            throw new Error(res.error || 'Error del backend');
        } catch (err) {
            toast.error('Error al actualizar', err.message);
            throw err;
        }
    }, [relationshipId, fetchCoupons]);

    const handleCreate = useCallback(async (couponData) => {
        try {
            if (navigator.onLine) {
                const res = await createCoupon({ ...couponData, relationshipId });
                if (res.success || (res && typeof res.success === 'undefined')) {
                    await fetchCoupons();
                    return res;
                }
                throw new Error(res.error || 'Error del backend');
            } else {
                // Modos offline
                const res = await queueCoupon(couponData, '', true);
                if (res.queued) {
                    toast.info('Creación encolada', 'Se creará en cuanto haya conexión.');
                    return { success: true, queued: true };
                }
            }
        } catch (err) {
            toast.error('Error al crear cupón', err.message);
            throw err;
        }
    }, [queueCoupon, relationshipId, fetchCoupons]);

    return {
        coupons,
        redemptions,
        isLoading,
        error,
        redeemCoupon: handleRedeemRequest,
        approveRedemption: (id) => handleUpdateStatus(id, 'approved'),
        postponeRedemption: (id, msg) => handleUpdateStatus(id, 'postponed', msg),
        completeRedemption: (id) => handleUpdateStatus(id, 'claimed'),
        claimRedemption: (id) => handleUpdateStatus(id, 'claimed'),
        dismissRedemption: (id) => handleUpdateStatus(id, 'dismissed'),
        refreshCoupons: fetchCoupons,
        createCoupon: handleCreate,
        updateCoupon: handleUpdate
    };
}
