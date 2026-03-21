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

        this.teaser = {
            unlockAt: data.teaser?.unlockAt ?? '2026-04-04T00:00:00',
            isEnabled: data.teaser?.isEnabled ?? true
        };

        this.inviteConfig = {
            inviteLink: data.inviteConfig?.inviteLink ?? null,
            generatedAt: data.inviteConfig?.generatedAt ?? null
        };

        this.citaConfig = {
            minPhotosSpontaneous: 5,
            minPhotosBingoDefault: 3,
            ...data.citaConfig
        };

        this.onboarding = {
            enabled: data.onboarding?.enabled ?? false,
            modules: {
                map: data.onboarding?.modules?.map ?? true,
                bingo: data.onboarding?.modules?.bingo ?? true,
                capsules: data.onboarding?.modules?.capsules ?? true,
                coupons: data.onboarding?.modules?.coupons ?? true,
                snapshots: data.onboarding?.modules?.snapshots ?? true,
                gallery: data.onboarding?.modules?.gallery ?? true,
                movies: data.onboarding?.modules?.movies ?? true,
                games: data.onboarding?.modules?.games ?? true,
            }
        };

        this.updatedAt = data.updatedAt || null;

        this.partner = {
            welcomeMessage: data.partner?.welcomeMessage ?? '¡Bienvenida a nuestro espacio! 💖',
            displayName: data.partner?.displayName ?? ''
        };
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
            teaser: this.teaser,
            inviteConfig: this.inviteConfig,
            citaConfig: this.citaConfig,
            onboarding: this.onboarding,
            partner: this.partner,
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
            teaser: data.teaser,
            inviteConfig: data.inviteConfig,
            citaConfig: data.citaConfig,
            onboarding: data.onboarding,
            partner: data.partner,
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
