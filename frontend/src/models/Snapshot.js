/**
 * Snapshot Model (Instantáneas)
 * Represents a spontaneous captured moment.
 */
export default class Snapshot {
    constructor(data = {}) {
        this.id = data.id || null;
        this.message = data.message || '';
        this.photoUrl = data.photoUrl || null;
        this.storagePath = data.storagePath || null;

        // Status
        this.isSeen = !!data.isSeen;
        this.relationshipId = data.relationshipId || null;

        // Timestamps
        this.seenAt = data.seenAt ? new Date(data.seenAt) : null;
        this.createdAt = data.createdAt ? new Date(data.createdAt) : null;
        this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
    }

    static fromFirestore(id, data) {
        return new Snapshot({ id, ...data });
    }
}
