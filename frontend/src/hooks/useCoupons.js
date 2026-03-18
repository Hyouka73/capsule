/**
 * useCoupons.js
 * 
 * Hook to manage coupons in real-time.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
    collection, 
    onSnapshot, 
    query, 
    where, 
    orderBy, 
    doc, 
    updateDoc, 
    serverTimestamp 
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { COLLECTIONS } from '../config/constants';
import Coupon from '../models/Coupon';
import { useOfflineActions } from './useOfflineActions';
import { toast } from '../components/ui/PastelToast/PastelToast';

export function useCoupons() {
    const [coupons, setCoupons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { queueAction } = useOfflineActions();

    useEffect(() => {
        const couponsRef = collection(db, COLLECTIONS.COUPONS);
        const q = query(
            couponsRef, 
            where('isActive', '==', true),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => Coupon.fromFirestore(doc));
            setCoupons(list);
            setIsLoading(false);
            setError(null);
        }, (err) => {
            console.error('[useCoupons] Error:', err);
            setError(err.message);
            setIsLoading(false);
        });

        return unsubscribe;
    }, []);

    const redeemCoupon = useCallback(async (couponId, usedNotes = '') => {
        try {
            const usedAt = new Date().toISOString();
            
            // Optimistic update
            setCoupons(prev => prev.map(c => 
                c.id === couponId 
                ? { ...c, isUsed: true, usedAt } 
                : c
            ));

            if (navigator.onLine) {
                const couponRef = doc(db, COLLECTIONS.COUPONS, couponId);
                await updateDoc(couponRef, {
                    isUsed: true,
                    usedAt: serverTimestamp(),
                    usedNotes
                });
                toast.success('¡Cupón cobrado! 💝', 'Disfruta tu regalo ✨');
            } else {
                // Queue for background sync
                await queueAction('coupon_used', { 
                    couponId, 
                    usedAt, 
                    usedNotes 
                });
                toast.info('Guardado offline 📱', 'Se sincronizará al recuperar conexión');
            }
            return { success: true };
        } catch (err) {
            console.error('[useCoupons] Error redeeming:', err);
            toast.error('Error al cobrar cupón');
            return { success: false, error: err.message };
        }
    }, [queueAction]);

    return {
        coupons,
        isLoading,
        error,
        redeemCoupon
    };
}
