/**
 * SystemConfig Model (Backend)
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
            pinTiers: data.mapConfig?.pinTiers || [
                { minVisits: 1, color: "#FFB6C1", scale: 1.0 },
                { minVisits: 3, color: "#FF7F7F", scale: 1.3 },
                { minVisits: 5, color: "#FF4444", scale: 1.5 },
                { minVisits: 10, color: "#FFD700", scale: 1.8 }
            ],
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

        this.updatedAt = data.updatedAt || null;

        this.partner = {
            welcomeMessage: data.partner?.welcomeMessage ?? '¡Bienvenida a nuestro espacio! 💖',
            displayName: data.partner?.displayName ?? ''
        };

        this.memoryTags = data.memoryTags || [
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
    }

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
            memoryTags: this.memoryTags,
            updatedAt: new Date().toISOString()
        };
    }
}
