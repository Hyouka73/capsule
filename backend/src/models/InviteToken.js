/**
 * InviteToken Model (Backend)
 */
export default class InviteToken {
    constructor(data = {}) {
        this.token = data.token || null;
        this.isClaimed = !!data.isClaimed;
        this.isRevoked = !!data.isRevoked;
        this.claimedBy = data.claimedBy || null;
        this.claimedDeviceId = data.claimedDeviceId || null;
        this.claimedAt = this._toDate(data.claimedAt);
        this.expiresAt = this._toDate(data.expiresAt);
        this.createdBy = data.createdBy || null;
        this.createdAt = this._toDate(data.createdAt);
    }

    _toDate(val) {
        if (!val) return null;
        if (typeof val.toDate === 'function') return val.toDate();
        return new Date(val);
    }

    toFirestore() {
        return {
            token: this.token,
            isClaimed: this.isClaimed,
            isRevoked: this.isRevoked,
            claimedBy: this.claimedBy,
            claimedDeviceId: this.claimedDeviceId,
            claimedAt: this.claimedAt,
            expiresAt: this.expiresAt,
            createdBy: this.createdBy,
            createdAt: this.createdAt || new Date(),
            updatedAt: this.updatedAt || new Date(),
        };
    }
}
