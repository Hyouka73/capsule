import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants';
import SystemConfig from '../models/SystemConfig';
import { openDB } from '../config/dbConfig';

const APP_CONFIG_CACHE_KEY = 'system_config';

const AppConfigContext = createContext(null);

/**
 * App Config Provider — reads /appConfig/main from Firestore in real-time.
 */
export function AppConfigProvider({ children }) {
    const [config, setConfig] = useState(new SystemConfig());
    const [isConfigLoaded, setIsConfigLoaded] = useState(false);

    useEffect(() => {
        const configRef = doc(
            db,
            COLLECTIONS.APP_CONFIG,
            SINGLETON_DOCS.APP_CONFIG
        );

        // Load from cache first
        const loadCache = async () => {
            try {
                const idb = await openDB();
                const tx = idb.transaction('app_cache', 'readonly');
                const store = tx.objectStore('app_cache');
                const req = store.get(APP_CONFIG_CACHE_KEY);
                req.onsuccess = () => {
                    if (req.result?.data) {
                        console.log('[AppConfig] Loaded from IndexedDB');
                        setConfig(SystemConfig.fromFirestore(req.result.data));
                        setIsConfigLoaded(true);
                    }
                };
            } catch (err) {
                console.warn('[AppConfig] IndexedDB Cache Error:', err);
            }
        };
        loadCache();

        const unsubscribe = onSnapshot(
            configRef,
            async (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    const newConfig = SystemConfig.fromFirestore(data);
                    setConfig(newConfig);
                    
                    // Persist to IndexedDB
                    try {
                        const idb = await openDB();
                        const tx = idb.transaction('app_cache', 'readwrite');
                        tx.objectStore('app_cache').put({ 
                            key: APP_CONFIG_CACHE_KEY, 
                            data, 
                            savedAt: Date.now() 
                        });
                    } catch (err) {
                        console.warn('[AppConfig] Failed to cache to IndexedDB:', err);
                    }
                } else {
                    setConfig(new SystemConfig());
                }
                setIsConfigLoaded(true);
            },
            (error) => {
                console.warn('[AppConfig] Firestore unavailable:', error.code);
                // If not already loaded from cache, we'll keep the defaults
                setIsConfigLoaded(true);
            }
        );

        return unsubscribe;
    }, []);

    const value = useMemo(() => ({
        ...config,
        isConfigLoaded,
        /**
         * Check if a feature is enabled
         * @param {string} featureName
         * @returns {boolean}
         */
        isFeatureOn: (featureName) => config.isFeatureOn(featureName),
    }), [config, isConfigLoaded]);

    return (
        <AppConfigContext.Provider value={value}>
            {children}
        </AppConfigContext.Provider>
    );
}

/**
 * Hook to access app config
 * @returns {{ features, visibility, wrappedConfig, mapConfig, notifications, isConfigLoaded, isFeatureOn }}
 */
export function useAppConfig() {
    const context = useContext(AppConfigContext);
    if (context === null) {
        throw new Error('useAppConfig must be used within an AppConfigProvider');
    }
    return context;
}

export default AppConfigContext;
