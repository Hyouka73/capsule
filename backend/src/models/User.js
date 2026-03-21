/**
 * User Model (Backend)
 */
export default class User {
    constructor(data = {}) {
        this.uid = data.uid || null;
        this.displayName = data.displayName || '';
        this.role = data.role || 'partner';
        this.isRevoked = !!data.isRevoked;
        this.deviceId = data.deviceId || null;
        this.platform = data.platform || 'web';
        this.userAgent = data.userAgent || '';
        this.deviceInfo = data.deviceInfo || {};
        this.fcmTokens = Array.isArray(data.fcmTokens) ? data.fcmTokens : [];
        this.preferences = {
            theme: data.preferences?.theme || 'dark',
            language: data.preferences?.language || 'es',
            notificationsEnabled: data.preferences?.notificationsEnabled ?? true,
            galleryOrderBy: data.preferences?.galleryOrderBy || 'eventDate',
            ...data.preferences
        };
        this.onboardingCompleted = {
            map: data.onboardingCompleted?.map ?? false,
            bingo: data.onboardingCompleted?.bingo ?? false,
            capsules: data.onboardingCompleted?.capsules ?? false,
            coupons: data.onboardingCompleted?.coupons ?? false,
            snapshots: data.onboardingCompleted?.snapshots ?? false,
            gallery: data.onboardingCompleted?.gallery ?? false,
            movies: data.onboardingCompleted?.movies ?? false,
            games: data.onboardingCompleted?.games ?? false,
        };
        this.welcomeSeen = data.welcomeSeen ?? false;
        this.teaserCompleted = data.teaserCompleted ?? false;

        this.lastActiveAt = this._toDate(data.lastActiveAt);
        this.lastSeenAt = this._toDate(data.lastSeenAt);
        this.registeredAt = this._toDate(data.registeredAt);
        this.createdAt = this._toDate(data.createdAt);
    }

    _toDate(val) {
        if (!val) return null;
        if (typeof val.toDate === 'function') return val.toDate();
        return new Date(val);
    }

    toFirestore() {
        return {
            uid: this.uid,
            displayName: this.displayName,
            role: this.role,
            isRevoked: this.isRevoked,
            deviceId: this.deviceId,
            platform: this.platform,
            userAgent: this.userAgent,
            deviceInfo: this.deviceInfo,
            fcmTokens: this.fcmTokens,
            preferences: this.preferences,
            onboardingCompleted: this.onboardingCompleted,
            welcomeSeen: this.welcomeSeen,
            teaserCompleted: this.teaserCompleted,
            lastActiveAt: this.lastActiveAt,
            lastSeenAt: this.lastSeenAt,
            registeredAt: this.registeredAt,
        };
    }
}
