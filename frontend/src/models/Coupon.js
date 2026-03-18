/**
 * Coupon Model
 */
export default class Coupon {
    constructor(data = {}) {
        this.id = data.id || null;
        this.title = data.title || 'Cupón';
        this.description = data.description || '';
        this.type = data.type || 'custom';
        this.icon = data.icon || 'favorite';
        this.emoji = data.emoji || '💝';
        this.isUsed = data.isUsed || false;
        this.usedAt = data.usedAt || null;
        this.usedNotes = data.usedNotes || '';
        this.tier = data.tier || 1;
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.createdAt = data.createdAt || new Date().toISOString();
    }

    static fromFirestore(doc) {
        if (!doc.exists()) return null;
        const data = doc.data();
        return new Coupon({
            id: doc.id,
            ...data
        });
    }

    toFirestore() {
        return {
            title: this.title,
            description: this.description,
            type: this.type,
            icon: this.icon,
            emoji: this.emoji,
            isUsed: this.isUsed,
            usedAt: this.usedAt,
            usedNotes: this.usedNotes,
            tier: this.tier,
            isActive: this.isActive,
            createdAt: this.createdAt
        };
    }
}
