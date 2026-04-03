/**
 * Capsule Model
 * Represents a time capsule in the system.
 */
export default class Capsule {
    constructor(data = {}) {
        this.id = data.id || null;
        this.title = data.title || '';
        this.message = data.message || '';
        this.teaserMessage = data.teaserMessage || '';

        // Behavior
        this.autoDestroy = !!(data.autoDestroy || data.autoDestruct);
        this.hasAttachments = !!data.hasAttachments;
        this.notifyOnUnlock = !!data.notifyOnUnlock;

        // Status
        this.isUnlocked = !!data.isUnlocked;
        this.isViewed = !!data.isViewed;
        this.isDestructed = !!data.isDestructed;

        // Locking
        this.unlockTrigger = data.unlockTrigger || 'date';
        this.unlockDate = data.unlockDate ? new Date(data.unlockDate) : null;
        this.unlockedAt = data.unlockedAt ? new Date(data.unlockedAt) : null;

        // Metadata
        this.source = data.source || 'admin_pick'; // admin_pick | slot_machine
        this.createdBy = data.createdBy || null;
        this.createdAt = data.createdAt ? new Date(data.createdAt) : null;
        this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
    }

    static fromFirestore(id, data) {
        return new Capsule({ id, ...data });
    }
}
