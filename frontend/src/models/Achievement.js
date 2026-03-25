/**
 * Achievement Model (v1.1)
 * Follows the same pattern as Coupon.js and User.js
 */
export default class Achievement {
    constructor(data = {}) {
        this.id = data.id || null;
        this.title = data.title || 'Nuevo Logro';
        this.description = data.description || '';
        this.emoji = data.emoji || '🏆';
        this.category = data.category || 'milestone'; // exploration | social | game | milestone
        this.rewardValue = data.rewardValue || 0;
        this.triggerType = data.triggerType || 'manual';
        this.triggerConfig = data.triggerConfig || {};
        this.isHidden = data.isHidden || false; // Easter Egg
        this.status = data.status || 'locked'; // locked | in_progress | earned
        this.earnedAt = this._toDate(data.earnedAt);
        this.createdAt = this._toDate(data.createdAt) || new Date().toISOString();
        this.progress = data.progress || 0;
    }

    /**
     * Helper to handle Firestore timestamps and ISO strings
     */
    _toDate(date) {
        if (!date) return null;
        if (typeof date.toDate === 'function') return date.toDate().toISOString();
        return date;
    }

    static fromFirestore(doc) {
        if (!doc.exists()) return null;
        const data = doc.data();
        return new Achievement({
            id: doc.id,
            ...data
        });
    }

    toFirestore() {
        return {
            title: this.title,
            description: this.description,
            emoji: this.emoji,
            category: this.category,
            rewardValue: this.rewardValue,
            triggerType: this.triggerType,
            triggerConfig: this.triggerConfig,
            isHidden: this.isHidden,
            createdAt: this.createdAt
        };
    }

    /**
     * PSEUDO-CODE FOR BACKEND EVALUATION (v1.1)
     * This logic will run in Cloud Functions triggers
     * 
     * async function checkPhotoCountAchievement(uid, currentCount) {
     *    const achievements = await db.collection('achievements')
     *       .where('triggerType', '==', 'PHOTO_COUNT')
     *       .get();
     * 
     *    for (const ach of achievements.docs) {
     *       const config = ach.data().triggerConfig;
     *       if (currentCount >= config.threshold) {
     *          await grantAchievement(uid, ach.id);
     *       }
     *    }
     * }
     */
}
