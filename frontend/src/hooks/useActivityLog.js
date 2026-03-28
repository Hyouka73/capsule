/**
 * useActivityLog.js
 * 
 * Hook to manage the activity feed for Admin.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getActivityLogs, markLogAsRead as apiMarkLogAsRead } from '../apiClient';
import { useAuth } from './useAuth';

export function useActivityLog() {
    const { relationshipId } = useAuth();
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [lastId, setLastId] = useState(null);

    const fetchLogs = useCallback(async (isLoadMore = false) => {
        if (!relationshipId) return;

        if (isLoadMore) {
            setIsFetchingMore(true);
        } else {
            setIsLoading(true);
        }

        try {
            const result = await getActivityLogs({
                limit: 50,
                startAfterLogId: isLoadMore ? lastId : null
            });

            if (result.success) {
                if (isLoadMore) {
                    setLogs(prev => [...prev, ...result.logs]);
                } else {
                    setLogs(result.logs);
                }
                setHasMore(result.hasMore);
                setLastId(result.lastId);
                setError(null);
            } else {
                setError(result.error || 'Failed to fetch logs');
            }
        } catch (err) {
            // silent fail
            setError(err.message);
        } finally {
            setIsLoading(false);
            setIsFetchingMore(false);
        }
    }, [relationshipId, lastId]);

    useEffect(() => {
        fetchLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [relationshipId]);

    const unreadCount = useMemo(() => {
        return logs.filter(log => !log.isReadByAdmin).length;
    }, [logs]);

    const markAsRead = useCallback(async (logId) => {
        try {
            const result = await apiMarkLogAsRead({ logId, markAll: false });
            if (result.success) {
                setLogs(prev => prev.map(log => 
                    log.id === logId ? { ...log, isReadByAdmin: true, readAt: new Date().toISOString() } : log
                ));
            }
        } catch (err) {
            // silent fail
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            const result = await apiMarkLogAsRead({ markAll: true });
            if (result.success) {
                setLogs(prev => prev.map(log => ({ 
                    ...log, 
                    isReadByAdmin: true, 
                    readAt: new Date().toISOString() 
                })));
            }
        } catch (err) {
            // silent fail
        }
    }, []);

    return {
        logs,
        unreadCount,
        isLoading,
        isFetchingMore,
        hasMore,
        error,
        fetchLogs,
        loadMore: () => fetchLogs(true),
        markAsRead,
        markAllAsRead
    };
}
