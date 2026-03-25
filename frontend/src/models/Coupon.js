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
        this.status = data.status || 'activo'; // 'activo' | 'inactivo' | 'cobrado'
        this.source = data.source || 'admin_direct'; // 'admin_direct' | 'slot_machine'
        this.maxRedemptions = data.maxRedemptions || 1;
        this.redemptionsLeft = data.redemptionsLeft !== undefined ? data.redemptionsLeft : (data.maxRedemptions || 1);
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || null;
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
            emoji: this.emoji,
            status: this.status,
            source: this.source,
            maxRedemptions: this.maxRedemptions,
            redemptionsLeft: this.redemptionsLeft,
            isActive: this.isActive,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}
