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

        const rawMap = data.mapConfig || data.map || {};
        this.mapConfig = {
            defaultCenter: { lat: 16.7521, lng: -93.1152 },
            defaultZoom: 12,
            style: 'romantic-vintage',
            lastActTimestamp: rawMap.lastActTimestamp || null,
            pinTiers: (rawMap.pinTiers || [
                { minVisits: 1, color: "#FFB6C1", scale: 0.8 },
                { minVisits: 3, color: "#BF7DB1", scale: 1.0 },
                { minVisits: 5, color: "#F38686", scale: 1.2 },
                { minVisits: 10, color: "#F3E595", scale: 1.4 },
                { minVisits: 15, color: "#CCFFF7", scale: 1.6 }
            ]).slice(0, 5),
            ...rawMap
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
            unlockAt: data.teaser?.unlockAt ?? 1775260800000, // Default to April 4, 2026 (ms)
            isEnabled: data.teaser?.isEnabled ?? true
        };

        this.inviteConfig = {
            inviteLink: data.inviteConfig?.inviteLink ?? null,
            generatedAt: data.inviteConfig?.generatedAt ?? null,
            expiresAt: data.inviteConfig?.expiresAt ?? null,
            isActive: data.inviteConfig?.isActive ?? true
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

        this.modules = {
            bingo: { isEnabled: data.modules?.bingo?.isEnabled ?? true },
            capsules: { isEnabled: data.modules?.capsules?.isEnabled ?? true },
            coupons: { isEnabled: data.modules?.coupons?.isEnabled ?? true },
            snapshots: { isEnabled: data.modules?.snapshots?.isEnabled ?? true },
            movies: { isEnabled: data.modules?.movies?.isEnabled ?? true },
            ...data.modules
        };

        this.updatedAt = data.updatedAt || null;
        this.teaserLock = data.teaserLock || null;
        this.partnerUid = data.partnerUid || null;

        this.partner = {
            welcomeMessage: data.partner?.welcomeMessage ?? '¡Bienvenida a nuestro espacio! 💖',
            displayName: data.partner?.displayName ?? ''
        };

        // Ensure memoryTags is always an array of objects (Firestore objects-wrapped-array fix)
        let incomingTags = data.memoryTags;
        if (incomingTags && typeof incomingTags === 'object' && !Array.isArray(incomingTags)) {
            // Remove 'updatedAt' from the object values before mapping
            const { updatedAt, ...indices } = incomingTags;
            incomingTags = Object.values(indices);
        }
        
        const defaultTags = [
            { value: 'viaje', label: 'Viaje ✈️' },
            { value: 'cita', label: 'Cita 🍷' },
            { value: 'aniversario', label: 'Aniversario 💝' },
            { value: 'random', label: 'Random 🤪' },
            { value: 'logro', label: 'Logro 🎯' },
            { value: 'hito', label: 'Hito 🌟' },
            { value: 'familia', label: 'Familia 👨‍👩‍👦' },
            { value: 'amigos', label: 'Amigos 👯‍♂️' },
            { value: 'cine', label: 'Cine 🍿' },
            { value: 'comida', label: 'Comida 🍝' },
            { value: 'aventura', label: 'Aventura 🌲' },
            { value: 'musica', label: 'Música 🎵' },
            { value: 'relax', label: 'Relax 💆‍♂️' },
            { value: 'deporte', label: 'Deporte 🏃‍♀️' },
            { value: 'arte', label: 'Arte 🎨' },
            { value: 'casa', label: 'En Casa 🏠' }
        ];

        this.memoryTags = (Array.isArray(incomingTags) && incomingTags.length > 0) 
            ? incomingTags
                .filter(tag => tag && typeof tag === 'object' && tag.value)
                .map(tag => ({ 
                    value: tag.value, 
                    label: tag.label || `${tag.value} 🏷️`
                }))
            : defaultTags;
    }

    /**
     * Converts to plain object for Firestore persistence
     */
    toFirestore() {
        const data = {
            features: this.features,
            visibility: this.visibility,
            wrapped: this.wrappedConfig,
            mapConfig: this.mapConfig,
            notifications: this.notifications,
            snapshotConfig: this.snapshotConfig,
            teaser: this.teaser,
            inviteConfig: this.inviteConfig,
            citaConfig: this.citaConfig,
            onboarding: this.onboarding,
            modules: this.modules,
            partner: this.partner,
            partnerUid: this.partnerUid,
            memoryTags: this.memoryTags,
            updatedAt: Date.now() // Use numeric timestamp in MS
        };
        
        // Remove undefined/null strictly to avoid wipes
        Object.keys(data).forEach(key => {
            if (data[key] === undefined || data[key] === null) {
                delete data[key];
            }
        });
        
        return data;
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
            mapConfig: data.mapConfig || data.map,
            notifications: data.notifications,
            snapshotConfig: data.snapshotConfig,
            teaser: data.teaser,
            teaserLock: data.teaserLock,
            inviteConfig: data.inviteConfig,
            citaConfig: data.citaConfig,
            onboarding: data.onboarding,
            modules: data.modules,
            partner: data.partner,
            partnerUid: data.partnerUid,
            memoryTags: data.memoryTags,
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
