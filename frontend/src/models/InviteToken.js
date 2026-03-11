/**
 * InviteToken Model
 * Represents an invitation for a partner to join the app.
 */
export default class InviteToken {
    constructor(data = {}) {
        this.token = data.token || null;

        // Status
        this.isClaimed = !!data.isClaimed;
        this.isRevoked = !!data.isRevoked;

        // Redemption info
        this.claimedBy = data.claimedBy || null;
        this.claimedDeviceId = data.claimedDeviceId || null;
        this.claimedAt = data.claimedAt ? new Date(data.claimedAt) : null;

        // Constraints
        this.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

        // Metadata
        this.createdBy = data.createdBy || null;
        this.createdAt = data.createdAt ? new Date(data.createdAt) : null;
    }

    static fromFirestore(data) {
        return new InviteToken(data);
    }

    get isValid() {
        if (this.isClaimed || this.isRevoked) return false;
        if (this.expiresAt && this.expiresAt < new Date()) return false;
        return true;
    }
}
