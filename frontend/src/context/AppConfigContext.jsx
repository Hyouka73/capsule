import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants';
import LOCAL_FEATURES from '../config/features';

const AppConfigContext = createContext(null);

/**
 * Default config — used as fallback when Firestore is unavailable.
 * Mirrors the /appConfig/main document structure.
 */
const DEFAULT_CONFIG = {
    features: LOCAL_FEATURES,
    visibility: {
        showCapsulesBeforeUnlock: false,
        showAdminNotes: false,
        showWrapped: false,
    },
    wrappedConfig: {
        anniversaryDate: '04-04',
        anniversaryYear: 2022,
        nextWrappedDate: '2026-04-04',
        defaultStatsMode: 'eventDate',
    },
    mapConfig: {
        defaultCenter: { lat: 16.7521, lng: -93.1152 },
        defaultZoom: 12,
        style: 'romantic-vintage',
    },
    notifications: {
        partnerFcmEnabled: true,
        adminActivityLogEnabled: true,
    },
    snapshotConfig: {
        timerSeconds: 9,
    },
};

/**
 * App Config Provider — reads /appConfig/main from Firestore in real-time.
 *
 * Exposes:
 *   features        — Feature flags (overrides local features.js)
 *   visibility      — What the partner can see
 *   wrappedConfig   — Anniversary date config
 *   mapConfig       — Mapbox defaults
 *   notifications   — FCM / activity log toggles
 *   snapshotConfig   — Timer and behaviour config for snapshot overlay
 *   isConfigLoaded  — False until first Firestore snapshot arrives
 *   isFeatureOn(name) — Helper function
 *
 * Usage:
 *   const { features, isFeatureOn, visibility } = useAppConfig();
 *   if (isFeatureOn('timeCapsules')) { ... }
 */
export function AppConfigProvider({ children }) {
    const [config, setConfig] = useState(DEFAULT_CONFIG);
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
                    // Merge with defaults so missing fields don't break the app
                    setConfig({
                        features: { ...DEFAULT_CONFIG.features, ...data.features },
                        visibility: { ...DEFAULT_CONFIG.visibility, ...data.visibility },
                        wrappedConfig: { ...DEFAULT_CONFIG.wrappedConfig, ...data.wrapped },
                        mapConfig: { ...DEFAULT_CONFIG.mapConfig, ...data.map },
                        notifications: { ...DEFAULT_CONFIG.notifications, ...data.notifications },
                        snapshotConfig: { ...DEFAULT_CONFIG.snapshotConfig, ...data.snapshotConfig },
                    });
                } else {
                    // Document doesn't exist yet — use defaults
                    setConfig(DEFAULT_CONFIG);
                }
                setIsConfigLoaded(true);
            },
            (error) => {
                // Firestore error (e.g. offline, permission denied before auth)
                // Fall back to local config silently
                console.warn('[AppConfig] Firestore unavailable, using local defaults:', error.code);
                setConfig(DEFAULT_CONFIG);
                setIsConfigLoaded(true);
            }
        );

        return unsubscribe;
    }, []);

    const value = useMemo(() => ({
        ...config,
        isConfigLoaded,
        /**
         * Check if a feature is enabled (Firestore overrides local features.js)
         * @param {string} featureName
         * @returns {boolean}
         */
        isFeatureOn: (featureName) => config.features[featureName] === true,
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
