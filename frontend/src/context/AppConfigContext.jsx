import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getAppConfig, updateAppConfig } from '../apiClient';
import { useAuth } from '../hooks/useAuth';
import SystemConfig from '../models/SystemConfig';
import { openDB } from '../config/dbConfig';

const APP_CONFIG_CACHE_KEY = 'system_config';
const AppConfigContext = createContext(null);

/**
 * App Config Provider — reads relationship-scoped config from BFF.
 * Architecture: relationships/{id}/config/ — each field in its own document
 *   partner-relevant: memoryTags, features, citaConfig, modules, partner
 *   admin-only: visibility, notifications, snapshotConfig, inviteConfig, onboarding
 *   already-modular: teaser, map, wrapped
 */
export function AppConfigProvider({ children }) {
    const { relationshipId } = useAuth();
    const [config, setConfig] = useState(new SystemConfig());
    const [isConfigLoaded, setIsConfigLoaded] = useState(false);
    const [isFromCache, setIsFromCache] = useState(false);
    const configRef = useRef(config);

    // Keep ref in sync to avoid dependency loops in fetchConfig
    useEffect(() => {
        configRef.current = config;
    }, [config]);

    const fetchConfig = useCallback(async (force = false) => {
        if (!relationshipId) {
            setIsConfigLoaded(true);
            return;
        }

        try {
            // 1. Determine client timestamp for conditional fetch (If-Modified-Since pattern)
            const clientTime = force ? null : (
                configRef.current?.updatedAt?.toMillis ? configRef.current.updatedAt.toMillis() :
                    (configRef.current?.updatedAt instanceof Date ? configRef.current.updatedAt.getTime() : configRef.current?.updatedAt)
            );

            const res = await getAppConfig({
                clientUpdatedAt: clientTime
            });

            if (res.unchanged) {
                // Backend confirms our local cache is the latest
                setIsConfigLoaded(true);
                return;
            }

            if (res.success) {
                const newConfig = SystemConfig.fromFirestore(res);
                setConfig(newConfig);
                setIsFromCache(false);

                // Persist new version to IndexedDB for next startup
                try {
                    const idb = await openDB();
                    const tx = idb.transaction('app_cache', 'readwrite');
                    tx.objectStore('app_cache').put({
                        key: APP_CONFIG_CACHE_KEY,
                        data: res,
                        savedAt: Date.now()
                    });
                } catch (idbErr) {
                    console.warn('[AppConfig] IndexedDB persistence failed:', idbErr);
                }
            }
        } catch (error) {
            // NETWORK ERROR / OFFLINE: Silent fail if we already have data from cache.
            // We don't want to show error screens just because the config check failed.
            console.log('[AppConfig] Config refresh skipped (offline or server unreachable).');
        } finally {
            // Always set to loaded so the app can proceed with whatever we have (cached or default)
            setIsConfigLoaded(true);
        }
    }, [relationshipId]);

    /**
     * updateConfig — Bidirectional Sync (Offline-First)
     * 1. Updates local state immediately (Optimistic).
     * 2. Persists to IndexedDB immediately (Persistent even if browser closes).
     * 3. Attempts to sync with the server.
     */
    const updateConfig = useCallback(async (updates) => {
        // 1. Create the new merged config locally
        const updatedData = { ...configRef.current, ...updates, updatedAt: new Date() };
        const newInstance = SystemConfig.fromFirestore(updatedData);

        // 2. Optimistic Update (React State)
        setConfig(newInstance);

        // 3. Persistent Local Update (IndexedDB)
        try {
            const idb = await openDB();
            const tx = idb.transaction('app_cache', 'readwrite');
            tx.objectStore('app_cache').put({
                key: APP_CONFIG_CACHE_KEY,
                data: updatedData,
                savedAt: Date.now()
            });
        } catch (err) {
            console.warn('[AppConfig] Failed to save optimistic update to IndexedDB:', err);
        }

        // 4. Remote Sync (API) — failure is ignored (Standard offline-first fallback)
        try {
            if (relationshipId) {
                await updateAppConfig({
                    relationshipId,
                    updates
                });
            }
        } catch (apiErr) {
            console.warn('[AppConfig] Remote sync failed, keeping local-only version for now.', apiErr);
        }
    }, [relationshipId]);

    useEffect(() => {
        // 1. Load from cache first
        const loadCache = async () => {
            try {
                const idb = await openDB();
                const tx = idb.transaction('app_cache', 'readonly');
                const store = tx.objectStore('app_cache');
                const req = store.get(APP_CONFIG_CACHE_KEY);
                req.onsuccess = () => {
                    if (req.result?.data) {
                        setConfig(SystemConfig.fromFirestore(req.result.data));
                        setIsConfigLoaded(true);
                        setIsFromCache(true);
                    }
                };
            } catch (err) {
                // silent fail
            }
        };
        loadCache();

        // 2. Fetch from network
        if (relationshipId) {
            fetchConfig();
        }

        // 3. SILENT CACHE-BUST MIGRATION: If we loaded from cache but it lacks membership data,
        // refresh in the background without blocking the UI.
        if (isConfigLoaded && (!configRef.current?.members || configRef.current.members.length === 0)) {
            fetchConfig(true);
        }

        // 3. Sync on online
        const handleOnline = () => {
            if (relationshipId) fetchConfig();
        };
        window.addEventListener('online', handleOnline);
        
        return () => window.removeEventListener('online', handleOnline);
    }, [relationshipId, fetchConfig]);

    const value = useMemo(() => ({
        ...config,
        config,
        relationshipId,
        isConfigLoaded,
        isFromCache,
        refreshConfig: fetchConfig,
        updateConfig,
        isFeatureOn: (featureName) => config.isFeatureOn(featureName),
    }), [config, relationshipId, isConfigLoaded, isFromCache, fetchConfig, updateConfig]);

    return (
        <AppConfigContext.Provider value={value}>
            {children}
        </AppConfigContext.Provider>
    );
}

export function useAppConfig() {
    const context = useContext(AppConfigContext);
    if (context === null) {
        throw new Error('useAppConfig must be used within an AppConfigProvider');
    }
    return context;
}

export default AppConfigContext;
