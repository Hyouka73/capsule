import { useState, useEffect, useCallback, useRef } from 'react';
import { getCoupons, createCoupon } from '../apiClient';
import { useAuth } from './useAuth';
import { useOfflineActions } from './useOfflineActions';
import { toast } from '../components/ui/PastelToast/PastelToast';

export function useCoupons({ adminMode = false } = {}) {
    const { relationshipId } = useAuth();
    const { queueCoupon, queueAction } = useOfflineActions();
    const [coupons, setCoupons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCoupons = useCallback(async () => {
        if (!relationshipId) return;
        setIsLoading(true);
        try {
            const res = await getCoupons();
            if (res.success) {
                setCoupons(res.coupons || []);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [relationshipId]);

    useEffect(() => {
        const isMounted = { current: true };
        
        const load = async () => {
            if (!relationshipId) return;
            setIsLoading(true);
            try {
                const res = await getCoupons();
                if (!isMounted.current) return;
                if (res.success) {
                    setCoupons(res.coupons || []);
                }
            } catch (err) {
                if (!isMounted.current) return;
                setError(err.message);
            } finally {
                if (isMounted.current) setIsLoading(false);
            }
        };

        load();

        return () => {
            isMounted.current = false;
        };
    }, [relationshipId]);

    const handleRedeem = useCallback(async (couponId, notes = '') => {
        try {
            const res = await queueCoupon(couponId, notes);
            if (res.queued) {
                toast.success('Solicitud enviada 💌', 'Tu cupón se canjeará en cuanto haya conexión ✨');
                return { success: true };
            }
            return { success: false, error: 'Error al encolar acción' };
        } catch (err) {
            toast.error('Error al solicitar canje');
            return { success: false, error: err.message };
        }
    }, [queueCoupon]);

    const handleCreate = useCallback(async (couponData) => {
        try {
            const res = await queueCoupon(couponData, '', true);
            if (res.queued) {
                toast.success('Petición de cupón encolada 💝', 'Se creará en cuanto estés online ✨');
                return { success: true, queued: true };
            }
            
            return { success: false, error: 'Error al encolar creación' };
        } catch (err) {
            toast.error('Error al crear cupón');
            throw err;
        }
    }, [queueCoupon]);

    return {
        coupons,
        isLoading,
        error,
        redeemCoupon: handleRedeem,
        createCoupon: handleCreate,
        refreshCoupons: fetchCoupons
    };
}
