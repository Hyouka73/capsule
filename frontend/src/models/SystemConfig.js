/**
 * SystemConfig Model
 * 
 * Data class to represent and validate system-wide configurations.
 */
export default class SystemConfig {
    constructor(data = {}) {
        this.features = {
            memoryMap: true,
            photoGallery: true,
            timeCapsules: true,
            coupons: true,
            bingoBoard: true,
            movieTracking: false,
            onboarding: false,
            easterEggs: false,
            games: false,
            exercise: false,
            ...data.features
        };

        this.visibility = {
            showAdminNotes: false,
            ...data.visibility
        };

        this.wrappedConfig = {
            anniversaryDate: '04-04',
            anniversaryYear: 2022,
            nextWrappedDate: '2026-04-04',
            defaultStatsMode: 'eventDate',
            ...data.wrappedConfig
        };

        this.mapConfig = {
            defaultCenter: { lat: 16.7521, lng: -93.1152 },
            defaultZoom: 12,
            style: 'romantic-vintage',
            ...data.mapConfig
        };

        this.notifications = {
            partnerFcmEnabled: true,
            adminActivityLogEnabled: true,
            ...data.notifications
        };

        this.snapshotConfig = {
            timerSeconds: 9,
            ...data.snapshotConfig
        };

        this.inviteConfig = {
            // No persistiremos el link real, solo metadatos si fuera necesario
            ...data.inviteConfig,
            inviteLink: data.inviteConfig?.inviteLink || ''
        };

        this.citaConfig = {
            minPhotosSpontaneous: 5,
            minPhotosBingoDefault: 3,
            ...data.citaConfig
        };

        this.updatedAt = data.updatedAt || null;
    }

    /**
     * Converts to plain object for Firestore persistence
     */
    toFirestore() {
        return {
            features: this.features,
            visibility: this.visibility,
            wrapped: this.wrappedConfig,
            map: this.mapConfig,
            notifications: this.notifications,
            snapshotConfig: this.snapshotConfig,
            // Excluimos inviteConfig para no guardar el link efímero
            citaConfig: this.citaConfig,
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * static fromFirestore
     */
    static fromFirestore(data) {
        if (!data) return new SystemConfig();
        
        return new SystemConfig({
            features: data.features,
            visibility: data.visibility,
            wrappedConfig: data.wrapped,
            mapConfig: data.map,
            notifications: data.notifications,
            snapshotConfig: data.snapshotConfig,
            inviteConfig: data.inviteConfig,
            citaConfig: data.citaConfig,
            updatedAt: data.updatedAt
        });
    }

    /**
     * Helper to check if a feature is on
     */
    isFeatureOn(name) {
        return this.features[name] === true;
    }
}
