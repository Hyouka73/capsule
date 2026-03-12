import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants';
import SystemConfig from '../models/SystemConfig';

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

        const unsubscribe = onSnapshot(
            configRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    // Use model to merge Firestore data with defaults
                    setConfig(SystemConfig.fromFirestore(data));
                } else {
                    // Document doesn't exist yet — use defaults
                    setConfig(new SystemConfig());
                }
                setIsConfigLoaded(true);
            },
            (error) => {
                // Firestore error (e.g. offline) — fall back to defaults
                console.warn('[AppConfig] Firestore unavailable, using local defaults:', error.code);
                setConfig(new SystemConfig());
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
