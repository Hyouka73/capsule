/**
 * Capsule Model (Backend)
 * Represents a time capsule in Firestore.
 */
export default class Capsule {
    constructor(data = {}) {
        this.id = data.id || null;
        this.title = data.title || '';
        this.message = data.message || '';
        this.teaserMessage = data.teaserMessage || '';

        // Relationship & Roles
        this.relationshipId = data.relationshipId || null;
        this.recipientUid = data.recipientUid || null;
        this.createdBy = data.createdBy || null;

        // Behavior
        this.autoDestroy = !!data.autoDestroy;
        this.hasAttachments = !!data.hasAttachments;
        this.notifyOnUnlock = !!data.notifyOnUnlock;

        // Status
        this.status = data.status || 'locked'; // 'locked' | 'unlocked' | 'opened' | 'expired' | 'destroyed'
        this.isUnlocked = !!data.isUnlocked;
        this.isViewed = !!data.isViewed; // Deprecated in favor of status
        this.isDestructed = !!data.isDestructed; // Deprecated in favor of status

        // Locking
        this.unlockTrigger = data.unlockTrigger || 'date';
        this.unlockDate = this._toDate(data.unlockDate);
        this.unlockedAt = this._toDate(data.unlockedAt);
        this.openedAt = this._toDate(data.openedAt);
        this.destroyedAt = this._toDate(data.destroyedAt);

        // Metadata
        this.createdAt = this._toDate(data.createdAt);
        this.updatedAt = this._toDate(data.updatedAt);
    }

    _toDate(val) {
        if (!val) return null;
        if (typeof val.toDate === 'function') return val.toDate();
        return new Date(val);
    }

    toFirestore() {
        return {
            title: this.title,
            message: this.message,
            teaserMessage: this.teaserMessage,
            relationshipId: this.relationshipId,
            recipientUid: this.recipientUid,
            createdBy: this.createdBy,
            autoDestroy: this.autoDestroy,
            hasAttachments: this.hasAttachments,
            notifyOnUnlock: this.notifyOnUnlock,
            status: this.status,
            isUnlocked: this.isUnlocked,
            isViewed: this.isViewed,
            isDestructed: this.isDestructed,
            unlockTrigger: this.unlockTrigger,
            unlockDate: this.unlockDate,
            unlockedAt: this.unlockedAt,
            openedAt: this.openedAt,
            destroyedAt: this.destroyedAt,
            createdAt: this.createdAt || new Date(),
            updatedAt: this.updatedAt || new Date(),
        };
    }
}
