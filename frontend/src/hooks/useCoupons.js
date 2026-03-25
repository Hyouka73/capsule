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
    addDoc,
    updateDoc, 
    deleteDoc,
    serverTimestamp 
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { COLLECTIONS } from '../config/constants';
import Coupon from '../models/Coupon';
import { useOfflineActions } from './useOfflineActions';
import { useAuth } from './useAuth';
import { toast } from '../components/ui/PastelToast/PastelToast';

export function useCoupons({ adminMode = false } = {}) {
    const { user } = useAuth();
    const [coupons, setCoupons] = useState([]);
    const [redemptions, setRedemptions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { queueAction } = useOfflineActions();

    useEffect(() => {
        let isMounted = true;
        let unsubscribeCoupons = null;
        let unsubscribeRedemptions = null;

        const couponsRef = collection(db, COLLECTIONS.COUPONS);
        
        let constraints = [orderBy('createdAt', 'desc')];
        if (!adminMode) {
            constraints.push(where('isActive', '==', true));
        }

        const q = query(couponsRef, ...constraints);

        unsubscribeCoupons = onSnapshot(q, (snapshot) => {
            if (!isMounted) return;
            const list = snapshot.docs.map(doc => Coupon.fromFirestore(doc));
            setCoupons(list);
            setIsLoading(false);
        }, (err) => {
            if (isMounted) {
                console.error('[useCoupons] Coupons Error:', err);
                setError(err.message);
                setIsLoading(false);
            }
        });

        // If not admin, also fetch redemptions for the current user
        if (!adminMode && user?.uid) {
            const redemptionsRef = collection(db, 'redemptions');
            const userRedemptionsQuery = query(
                redemptionsRef, 
                where('userId', '==', user.uid), 
                orderBy('requestedAt', 'desc')
            );
            
            unsubscribeRedemptions = onSnapshot(userRedemptionsQuery, (snapshot) => {
                if (!isMounted) return;
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setRedemptions(list);
            }, (err) => {
                if (isMounted) console.error('[useCoupons] Redemptions Error:', err);
            });
        }

        return () => {
            isMounted = false;
            unsubscribeCoupons?.();
            unsubscribeRedemptions?.();
        };
    }, [adminMode, user?.uid]);

    const redeemCoupon = useCallback(async (couponId, notes = '') => {
        if (!user?.uid) return { success: false, error: 'Auth required' };
        try {
            // New logic: Create a redemption record with status 'pending_approval'
            const redemptionData = {
                userId: user.uid,
                couponId,
                status: 'pending_approval',
                requestedAt: serverTimestamp(),
                note: notes || null
            };

            await addDoc(collection(db, 'redemptions'), redemptionData);
            toast.success('Solicitud enviada 💌', 'Admin lo revisará pronto ✨');
            return { success: true };
        } catch (err) {
            console.error('[useCoupons] Error redeeming:', err);
            toast.error('Error al solicitar canje');
            return { success: false, error: err.message };
        }
    }, [user?.uid]);

    const assignCouponDirectly = useCallback(async (couponId, targetUserId) => {
        if (!user?.uid) throw new Error('Auth required');
        try {
            const redemptionData = {
                userId: targetUserId,
                couponId,
                status: 'assigned',
                requestedAt: serverTimestamp(),
                assignedAt: serverTimestamp(),
                assignedBy: user.uid
            };

            await addDoc(collection(db, 'redemptions'), redemptionData);
            return { success: true };
        } catch (err) {
            console.error('[useCoupons] Error assigning:', err);
            throw err;
        }
    }, [user?.uid]);

    const claimRedemption = useCallback(async (redemptionId) => {
        try {
            const redemptionRef = doc(db, 'redemptions', redemptionId);
            await updateDoc(redemptionRef, {
                status: 'claimed',
                claimedAt: serverTimestamp()
            });

            // Update redemptionsLeft in coupon
            // Need to get couponId first from somewhere or pass it
            return { success: true };
        } catch (err) {
            toast.error('Error al marcar como cobrado');
            return { success: false };
        }
    }, []);

    const createCoupon = useCallback(async (couponData) => {
        try {
            const docRef = await addDoc(collection(db, COLLECTIONS.COUPONS), {
                ...couponData,
                status: 'activo',
                createdAt: serverTimestamp()
            });
            return { success: true, id: docRef.id };
        } catch (err) {
            console.error('[useCoupons] Error creating:', err);
            throw err;
        }
    }, []);

    const updateCoupon = useCallback(async (id, data) => {
        try {
            const couponRef = doc(db, COLLECTIONS.COUPONS, id);
            await updateDoc(couponRef, {
                ...data,
                updatedAt: serverTimestamp()
            });
            return { success: true };
        } catch (err) {
            console.error('[useCoupons] Error updating:', err);
            throw err;
        }
    }, []);

    const deleteCoupon = useCallback(async (id) => {
        try {
            const couponRef = doc(db, COLLECTIONS.COUPONS, id);
            await deleteDoc(couponRef);
            return { success: true };
        } catch (err) {
            console.error('[useCoupons] Error deleting:', err);
            throw err;
        }
    }, []);

    return {
        coupons,
        redemptions,
        isLoading,
        error,
        redeemCoupon,
        assignCouponDirectly,
        claimRedemption,
        createCoupon,
        updateCoupon,
        deleteCoupon
    };
}
