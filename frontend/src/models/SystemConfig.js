
/**
 * SystemConfig — Source of Truth para la configuración global de la relación.
 * 
 * Este modelo consolida la información de múltiples documentos de la subcolección `config`
 * y la relación principal en un solo objeto inmutable para el frontend.
 */
export default class SystemConfig {
    constructor(data = {}) {
        // Core features (flags de funcionalidad)
        this.features = data.features || {
            capsules: true,
            multimedia: true,
            snapshots: true,
            bingo: true,
            wrapped: false,
            teaser: false
        };

        // Visibilidad y privacidad
        this.visibility = data.visibility || {
            mapMemories: 'shared',
            gallery: 'shared'
        };

        // Notificaciones y canales
        this.notifications = data.notifications || {
            fcmEnabled: true,
            emailEnabled: true,
            types: ['memory', 'capsule', 'daily_moment', 'bingo']
        };

        // Configuración de Multimedia/Instantáneas
        this.snapshotConfig = data.snapshotConfig || {
            frequency: 'daily',
            maxPerDay: 1,
            retentionDays: 30
        };

        this.citaConfig = data.citaConfig || {
            allowManual: true,
            maxActive: 3
        };

        // Invitaciones y Registro
        this.inviteConfig = data.inviteConfig || {
            allowInvites: true,
            maxMembers: 2
        };

        // Onboarding Meta
        this.onboarding = data.onboarding || {
            isCompleted: false,
            step: 0
        };

        // Etiquetas de recuerdos personalizadas
        this.memoryTags = data.memoryTags || [];

        // Configuración de Wrapped (Anual)
        this.wrappedConfig = data.wrappedConfig || {
            isEnabled: false,
            year: new Date().getFullYear()
        };

        // Details of the map (initially from mapConfig or legacy docs.map)
        const map = data.mapConfig || {};
        this.mapConfig = {
            defaultZoom: map.defaultZoom ?? 12,
            defaultCenter: {
                lat: map.defaultCenter?.lat ?? 0,
                lng: map.defaultCenter?.lng ?? 0
            },
            style: map.style || 'pastel',
            clustering: map.clustering !== false,
            pinTiers: Array.isArray(map.pinTiers) ? map.pinTiers : [
                { minVisits: 0, color: "#FFB6C1", scale: 1.0 },
                { minVisits: 5, color: "#FF69B4", scale: 1.2 },
                { minVisits: 15, color: "#FF1493", scale: 1.5 }
            ]
        };

        // Teaser / Coming Soon
        const teaserData = data.teaser || {};
        
        // Robust converter for date/timestamp
        let rDate = teaserData.revealDate || null;
        if (rDate && typeof rDate === 'object') {
            if (rDate.toMillis) rDate = rDate.toMillis();
            else if (rDate.seconds) rDate = rDate.seconds * 1000;
            else if (rDate._seconds) rDate = rDate._seconds * 1000;
        }

        const parsedDate = (typeof rDate === 'number') ? rDate : (rDate ? new Date(rDate).getTime() : null);

        this.teaser = {
            isEnabled: teaserData.isEnabled !== false,
            message: teaserData.message || '',
            revealDate: (!parsedDate || isNaN(parsedDate)) ? null : parsedDate
        };

        // Modules (Core business features)
        const modData = data.modules || {};
        this.modules = {
            capsules: { 
                isEnabled: modData.capsules?.isEnabled ?? true, 
                onboardingEnabled: modData.capsules?.onboardingEnabled ?? false 
            },
            snapshots: { 
                isEnabled: modData.snapshots?.isEnabled ?? true, 
                onboardingEnabled: modData.snapshots?.onboardingEnabled ?? false 
            },
            bingo: { 
                isEnabled: modData.bingo?.isEnabled ?? true, 
                onboardingEnabled: modData.bingo?.onboardingEnabled ?? false 
            },
            coupons: { 
                isEnabled: modData.coupons?.isEnabled ?? true, 
                onboardingEnabled: modData.coupons?.onboardingEnabled ?? false 
            },
            movies: { 
                isEnabled: modData.movies?.isEnabled ?? false, 
                onboardingEnabled: modData.movies?.onboardingEnabled ?? false 
            }
        };

        // Partner details
        const partnerData = data.partner || {};
        this.partner = {
            uid: partnerData.uid || null,
            displayName: partnerData.displayName || '',
            photoURL: partnerData.photoURL || '',
            lastActive: partnerData.lastActive || null
        };

        // Nombres/Apodos personalizados
        this.names = data.names || {
            admin: 'Tú',
            partner: 'Tu Pareja'
        };

        // Identidad de la relación
        this.adminUid = data.adminUid || null;
        this.partnerUid = data.partnerUid || null;
        this.members = Array.isArray(data.members) ? data.members : [];
        
        // Metadata
        this.updatedAt = data.updatedAt || 0;
    }

    /**
     * Reconstruye el modelo a partir de los documentos de Firestore traídos por getAppConfig.
     * 
     * @param {Object} res - Respuesta balanceada del API getAppConfig
     * @returns {SystemConfig}
     */
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

        // Extraer identidad y miembros
        const relDoc = docs.relationship || {};
        const members = relDoc.members || [];
        const adminUid = relDoc.adminUid || (members.length > 0 ? members[0] : null);
        
        // El partner es el miembro que NO es el admin
        let partnerUid = relDoc.partnerUid;
        if (!partnerUid && members.length > 1) {
            partnerUid = members.find(m => m !== adminUid);
        }

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
            names:         docs.names,
            adminUid,
            partnerUid,
            members,
            updatedAt:     res.serverUpdatedAt || maxUpdatedAt
        });
    }

    /**
     * Helper to check if a feature is on
     */
    isFeatureOn(name) {
        return this.features && this.features[name] === true;
    }

    /**
     * Serializes the model into a structure expected by the updateAppConfig Cloud Function.
     * Maps local model properties back to their corresponding document names in Firestore.
     */
    toFirestore() {
        return {
            features: this.features,
            visibility: this.visibility,
            notifications: this.notifications,
            // Multimedia document combines these two
            multimedia: {
                snapshotConfig: this.snapshotConfig,
                citaConfig: this.citaConfig
            },
            inviteConfig: this.inviteConfig,
            onboarding: this.onboarding,
            memoryTags: this.memoryTags, // Corrected: Backend expects raw array
            wrapped: this.wrappedConfig,
            mapConfig: this.mapConfig, // Corrected: Match backend 'mapConfig' trigger
            teaser: this.teaser, // { isEnabled, message, revealDate }
            modules: this.modules,
            partner: this.partner,
            names: this.names
        };
    }
}
