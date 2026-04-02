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

        const rawUnlockAt = data.teaser?.unlockAt;
        let unlockAt = 1775260800000; // Default to April 4, 2026 (ms)
        if (rawUnlockAt) {
            unlockAt = (rawUnlockAt.toMillis) ? rawUnlockAt.toMillis() : 
                       (rawUnlockAt.seconds) ? rawUnlockAt.seconds * 1000 :
                       new Date(rawUnlockAt).getTime();
        }

        this.teaser = {
            unlockAt: isNaN(unlockAt) ? 1775260800000 : unlockAt,
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

        // ── Memory Tags ── Immutable ID system
        // New format: { id: 'tag_viaje', label: 'Viaje', emoji: '✈️' }
        // Legacy format (auto-migrated): { value: 'viaje', label: 'Viaje ✈️' }
        let incomingTags = data.memoryTags;
        if (incomingTags && typeof incomingTags === 'object' && !Array.isArray(incomingTags)) {
            const { updatedAt, ...indices } = incomingTags;
            incomingTags = Object.values(indices);
        }

        const defaultTags = [
            { id: 'tag_viaje',      label: 'Viaje',      emoji: '✈️'    },
            { id: 'tag_cita',       label: 'Cita',       emoji: '🍷'    },
            { id: 'tag_romantico',  label: 'Romántico',  emoji: '❤️'    },
            { id: 'tag_aniversario',label: 'Aniversario',emoji: '💝'    },
            { id: 'tag_random',     label: 'Random',     emoji: '🤪'    },
            { id: 'tag_logro',      label: 'Logro',      emoji: '🎯'    },
            { id: 'tag_hito',       label: 'Hito',       emoji: '🌟'    },
            { id: 'tag_familia',    label: 'Familia',    emoji: '👨‍👩‍👦'  },
            { id: 'tag_amigos',     label: 'Amigos',     emoji: '👯‍♂️'  },
            { id: 'tag_cine',       label: 'Cine',       emoji: '🍿'    },
            { id: 'tag_comida',     label: 'Comida',     emoji: '🍝'    },
            { id: 'tag_aventura',   label: 'Aventura',   emoji: '🌲'    },
            { id: 'tag_musica',     label: 'Música',     emoji: '🎵'    },
            { id: 'tag_relax',      label: 'Relax',      emoji: '💆‍♂️' },
            { id: 'tag_deporte',    label: 'Deporte',    emoji: '🏃‍♀️' },
            { id: 'tag_arte',       label: 'Arte',       emoji: '🎨'    },
            { id: 'tag_casa',       label: 'En Casa',    emoji: '🏠'    },
        ];

        this.memoryTags = (Array.isArray(incomingTags) && incomingTags.length > 0)
            ? incomingTags
                .filter(tag => tag && typeof tag === 'object')
                .map(tag => {
                    // New format already has id
                    if (tag.id) {
                        return {
                            id: tag.id,
                            label: tag.label || '',
                            emoji: tag.emoji || '🏷️'
                        };
                    }
                    // Migration from legacy {value, label} format
                    // e.g. { value: 'viaje', label: 'Viaje ✈️' } → { id: 'tag_viaje', label: 'Viaje', emoji: '✈️' }
                    if (tag.value) {
                        const parts = (tag.label || tag.value).split(' ');
                        const emoji = parts.length > 1 ? parts[parts.length - 1] : '🏷️';
                        const text = parts.length > 1 ? parts.slice(0, -1).join(' ') : tag.value;
                        return {
                            id: `tag_${tag.value}`,
                            label: text,
                            emoji: emoji,
                        };
                    }
                    return null;
                })
                .filter(Boolean)
            : defaultTags;
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
            multimedia: {
                snapshotConfig: this.snapshotConfig,
                citaConfig: this.citaConfig
            },
            teaser: this.teaser,
            inviteConfig: this.inviteConfig,
            onboarding: this.onboarding,
            modules: this.modules,
            partner: this.partner,
            partnerUid: this.partnerUid,
            memoryTags: this.memoryTags,
            updatedAt: Date.now()
        };
    }

    static fromFirestore(res) {
        if (!res || !res.config) return new SystemConfig();

        const docs = res.config;
        const multimedia = docs.multimedia || {};

        // Compute max updatedAt across all config docs for cache invalidation
        const allUpdatedAts = Object.values(docs)
            .map(d => {
                const v = d?.updatedAt;
                if (!v) return 0;
                if (typeof v.toMillis === 'function') return v.toMillis();
                if (v.seconds) return v.seconds * 1000;
                if (typeof v === 'number') return v;
                return 0;
            });
        const maxUpdatedAt = allUpdatedAts.length ? Math.max(...allUpdatedAts) : null;

        return new SystemConfig({
            features:      docs.features,
            visibility:    docs.visibility,
            notifications: docs.notifications,
            // Consolidated Multimedia (snapshot + cita), fallback to legacy docs if exists
            snapshotConfig: multimedia.snapshotConfig || docs.snapshotConfig,
            citaConfig:    multimedia.citaConfig || docs.citaConfig,
            inviteConfig:  docs.inviteConfig,
            onboarding:    docs.onboarding,
            memoryTags:    Array.isArray(docs.memoryTags?.tags) ? docs.memoryTags.tags : undefined,
            wrappedConfig: docs.wrapped,
            mapConfig:     docs.map,
            teaser:        docs.teaser,
            modules:       docs.modules,
            partner:       docs.partner,
            partnerUid:    docs.relationship?.partnerUid,
            updatedAt:     maxUpdatedAt
        });
    }

    /**
     * Helper to check if a feature is on
     */
    isFeatureOn(name) {
        return this.features[name] === true;
    }
}
