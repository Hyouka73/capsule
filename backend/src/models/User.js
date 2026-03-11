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
            lastActiveAt: this.lastActiveAt,
            lastSeenAt: this.lastSeenAt,
            registeredAt: this.registeredAt,
        };
    }
}
