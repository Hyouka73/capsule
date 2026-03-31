import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getAppConfig } from '../apiClient';
import { useAuth } from '../hooks/useAuth';
import SystemConfig from '../models/SystemConfig';
import { openDB } from '../config/dbConfig';

const APP_CONFIG_CACHE_KEY = 'system_config';
const AppConfigContext = createContext(null);

/**
 * App Config Provider — reads relationship-scoped config from BFF.
 * Path: relationships/{id}/config/main
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
        if (!relationshipId) return;
        
        try {
            // Explicitly convert Date/Timestamp to numeric MS for reliable backend comparison
            const clientTime = force ? null : (
                configRef.current?.updatedAt?.toMillis ? configRef.current.updatedAt.toMillis() : 
                (configRef.current?.updatedAt instanceof Date ? configRef.current.updatedAt.getTime() : configRef.current?.updatedAt)
            );

            const res = await getAppConfig({ 
                clientUpdatedAt: clientTime
            });

            if (res.unchanged) {
                setIsConfigLoaded(true);
                return; // No update needed
            }

            if (res.success) {
                const newConfig = SystemConfig.fromFirestore(res);
                setConfig(newConfig);
                setIsFromCache(false);
                
                // Persist new version to IndexedDB
                try {
                    const idb = await openDB();
                    const tx = idb.transaction('app_cache', 'readwrite');
                    tx.objectStore('app_cache').put({ 
                        key: APP_CONFIG_CACHE_KEY, 
                        data: res, 
                        savedAt: Date.now() 
                    });
                } catch (err) {
                    // silent fail
                }
            }
        } catch (error) {
            // API unavailable
        } finally {
            setIsConfigLoaded(true);
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
        isFeatureOn: (featureName) => config.isFeatureOn(featureName),
    }), [config, relationshipId, isConfigLoaded, isFromCache, fetchConfig]);

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
