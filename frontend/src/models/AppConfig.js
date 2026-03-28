/**
 * AppConfig Model
 * Represents the global application configuration and current relationship state.
 */
export default class AppConfig {
    constructor(data = {}) {
        this.partnerUid = data.partnerUid || '';
        this.partnerToken = data.partnerToken || '';
        this.tokenRevokedAt = data.tokenRevokedAt || null;
        this.relationshipId = data.relationshipId || '';
        this.modules = data.modules || {};
        this.teaserLock = data.teaserLock || null; // Admin-level teaser unlock date (ISO string)
        
        // Extended fields if integration with SystemConfig is needed
        this.features = data.features || {};
        this.visibility = data.visibility || {};
        this.map = data.map || {};
        this.notifications = data.notifications || {};
    }

    static fromFirestore(data) {
        if (!data) return new AppConfig();
        return new AppConfig(data);
    }

    toFirestore() {
        return {
            partnerUid: this.partnerUid,
            partnerToken: this.partnerToken,
            tokenRevokedAt: this.tokenRevokedAt,
            relationshipId: this.relationshipId,
            modules: this.modules,
            teaserLock: this.teaserLock,
            features: this.features,
            visibility: this.visibility,
            map: this.map,
            notifications: this.notifications,
            updatedAt: new Date().toISOString()
        };
    }
}
