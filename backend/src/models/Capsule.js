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

        // Behavior
        this.autoDestruct = !!data.autoDestruct;
        this.hasAttachments = !!data.hasAttachments;
        this.notifyOnUnlock = !!data.notifyOnUnlock;

        // Status
        this.isUnlocked = !!data.isUnlocked;
        this.isViewed = !!data.isViewed;
        this.isDestructed = !!data.isDestructed;

        // Locking
        this.unlockTrigger = data.unlockTrigger || 'date';
        this.unlockDate = this._toDate(data.unlockDate);
        this.unlockedAt = this._toDate(data.unlockedAt);

        // Metadata
        this.createdBy = data.createdBy || null;
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
            autoDestruct: this.autoDestruct,
            hasAttachments: this.hasAttachments,
            notifyOnUnlock: this.notifyOnUnlock,
            isUnlocked: this.isUnlocked,
            isViewed: this.isViewed,
            isDestructed: this.isDestructed,
            unlockTrigger: this.unlockTrigger,
            unlockDate: this.unlockDate,
            unlockedAt: this.unlockedAt,
            createdBy: this.createdBy,
            createdAt: this.createdAt || new Date(),
            updatedAt: this.updatedAt || new Date(),
        };
    }
}
