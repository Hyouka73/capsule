/**
 * Snapshot Model (Backend)
 */
export default class Snapshot {
    constructor(data = {}) {
        this.id = data.id || null;
        this.message = data.message || '';
        this.photoUrl = data.photoUrl || null;
        this.storagePath = data.storagePath || null;

        // Status
        this.isSeen = !!data.isSeen;

        // Timestamps
        this.seenAt = this._toDate(data.seenAt);
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
            message: this.message,
            photoUrl: this.photoUrl,
            storagePath: this.storagePath,
            isSeen: this.isSeen,
            seenAt: this.seenAt,
        };
    }
}
