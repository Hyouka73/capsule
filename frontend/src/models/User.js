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

        // Preferences
        this.preferences = {
            theme: data.preferences?.theme || 'dark',
            language: data.preferences?.language || 'es',
            notificationsEnabled: data.preferences?.notificationsEnabled ?? true,
            galleryOrderBy: data.preferences?.galleryOrderBy || 'eventDate',
            ...data.preferences
        };

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
