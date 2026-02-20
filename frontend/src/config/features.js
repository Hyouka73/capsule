/**
 * Feature flags — controls which modules are enabled.
 * These mirror the /appConfig/main Firestore document.
 * AppConfigContext will override these at runtime once Firestore is available,
 * allowing remote toggle without redeploy.
 */

const FEATURES = {
    // TIER 0 — Always on
    teaser: true,

    // TIER 1 — MVP (launch April 4)
    memoryMap: false,
    photoGallery: false,
    shoebox: false,
    timeCapsules: false,
    wrapped: false,
    adminPanel: false,

    // TIER 2 — Post-launch
    bingoBoard: false,
    movieTracking: false,
    scrapbook: false,
    coupons: false,

    // TIER 3 — Enhancement
    onboarding: false,
    easterEggs: false,
};

/**
 * Check if a feature is enabled
 * @param {string} featureName
 * @returns {boolean}
 */
export function isFeatureEnabled(featureName) {
    return FEATURES[featureName] === true;
}

/**
 * Get all enabled features
 * @returns {string[]}
 */
export function getEnabledFeatures() {
    return Object.entries(FEATURES)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name);
}

export default FEATURES;
