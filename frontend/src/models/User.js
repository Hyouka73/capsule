/**
 * User Model
 * Represents a person (Admin or Partner) in the system.
 */
export default class User {
    constructor(data = {}) {
        this.uid = data.uid || null;
        this.displayName = data.displayName || '';
        this.role = data.role || 'partner'; // 'admin' | 'partner'
        this.isRevoked = !!data.isRevoked;

        // Device info
        this.deviceId = data.deviceId || null;
        this.platform = data.platform || 'web';
        this.userAgent = data.userAgent || '';
        this.deviceInfo = data.deviceInfo || {};

        // Messaging
        this.fcmTokens = Array.isArray(data.fcmTokens) ? data.fcmTokens : [];
        this.gameCoins = data.gameCoins || 0;
        this.coinTransactions = Array.isArray(data.coinTransactions) ? data.coinTransactions : [];

        // Preferences
        this.preferences = {
            theme: data.preferences?.theme || 'dark',
            language: data.preferences?.language || 'es',
            notificationsEnabled: data.preferences?.notificationsEnabled ?? true,
            galleryOrderBy: data.preferences?.galleryOrderBy || 'eventDate',
            ...data.preferences
        };

        // Onboarding & Welcome stats
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

        // Activity tracking
        this.lastActiveAt = data.lastActiveAt ? new Date(data.lastActiveAt) : null;
        this.lastSeenAt = data.lastSeenAt ? new Date(data.lastSeenAt) : null;
        this.registeredAt = data.registeredAt ? new Date(data.registeredAt) : null;
        this.createdAt = data.createdAt ? new Date(data.createdAt) : null;
    }

    static fromFirestore(uid, data) {
        return new User({ uid, ...data });
    }

    get isAdmin() {
        return this.role === 'admin';
    }

    get isPartner() {
        return this.role === 'partner';
    }
}
