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
import { toast } from '../components/ui/PastelToast/PastelToast';

export function useCoupons({ adminMode = false } = {}) {
    const [coupons, setCoupons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { queueAction } = useOfflineActions();

    useEffect(() => {
        const couponsRef = collection(db, COLLECTIONS.COUPONS);
        
        // Admin sees everything, Partner only active coupons
        const constraints = [orderBy('createdAt', 'desc')];
        if (!adminMode) {
            constraints.unshift(where('isActive', '==', true));
        }

        const q = query(couponsRef, ...constraints);

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
    }, [adminMode]);

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

    const createCoupon = useCallback(async (couponData) => {
        try {
            const docRef = await addDoc(collection(db, COLLECTIONS.COUPONS), {
                ...couponData,
                isUsed: false,
                usedAt: null,
                usedNotes: '',
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
        isLoading,
        error,
        redeemCoupon,
        createCoupon,
        updateCoupon,
        deleteCoupon
    };
}
