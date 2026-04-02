import { getAppConfig, updateAppConfig as updateAppConfigApi } from '../apiClient';

/**
 * Persist global application settings via BFF
 */
export async function saveGlobalSettings(settings) {
    return updateAppConfigApi({ update: settings });
}

/**
 * Update partial settings via BFF
 */
export async function updateConfig(partialSettings) {
    return updateAppConfigApi({ update: partialSettings });
}

/**
 * Fetch global application settings once via BFF
 */
export async function getGlobalSettings() {
    return getAppConfig();
}

/**
 * Deprecated: Real-time settings should be handled via AppConfigContext
 */
export function subscribeToGlobalSettings(callback) {
    console.warn('[settingsService] subscribeToGlobalSettings is deprecated. Use AppConfigContext.');
    return () => {};
}
