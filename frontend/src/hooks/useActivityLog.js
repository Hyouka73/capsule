/**
 * useActivityLog.js
 * 
 * Hook to manage the activity feed for Admin.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    collection, 
    onSnapshot, 
    query, 
    orderBy, 
    doc, 
    updateDoc, 
    writeBatch
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { COLLECTIONS } from '../config/constants';

export function useActivityLog() {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const logRef = collection(db, COLLECTIONS.ACTIVITY_LOG);
        const q = query(logRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            }));
            setLogs(list);
            setIsLoading(false);
            setError(null);
        }, (err) => {
            console.error('[useActivityLog] Error:', err);
            setError(err.message);
            setIsLoading(false);
        });

        return unsubscribe;
    }, []);

    const unreadCount = useMemo(() => {
        return logs.filter(log => !log.isReadByAdmin).length;
    }, [logs]);

    const markAsRead = useCallback(async (logId) => {
        try {
            const ref = doc(db, COLLECTIONS.ACTIVITY_LOG, logId);
            await updateDoc(ref, { isReadByAdmin: true });
        } catch (err) {
            console.error('[useActivityLog] Error marking as read:', err);
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        const unreadLogs = logs.filter(l => !l.isReadByAdmin);
        if (unreadLogs.length === 0) return;

        const batch = writeBatch(db);
        unreadLogs.forEach(log => {
            const ref = doc(db, COLLECTIONS.ACTIVITY_LOG, log.id);
            batch.update(ref, { isReadByAdmin: true });
        });

        try {
            await batch.commit();
        } catch (err) {
            console.error('[useActivityLog] Error marking all as read:', err);
        }
    }, [logs]);

    return {
        logs,
        unreadCount,
        isLoading,
        error,
        markAsRead,
        markAllAsRead
    };
}
