/**
 * BingoBoard Model
 * Standardizes the structure of the singleton Bingo board.
 */
export default class BingoBoard {
    constructor(data = {}) {
        this.id = data.id || 'main';
        this.categories = Array.isArray(data.categories) ? data.categories : [];
        this.completedCount = data.completedCount || 0;
        this.totalCount = data.totalCount || 16;
        this.relationshipId = data.relationshipId || null;
        
        // Status tracking
        this.updatedAt = data.updatedAt || null;
        this.lastResetAt = data.lastResetAt || null;
    }

    static fromFirestore(data, id = 'main') {
        if (!data) return new BingoBoard({ id });
        return new BingoBoard({ id, ...data });
    }

    toFirestore() {
        return {
            categories: this.categories,
            completedCount: this.completedCount,
            totalCount: this.totalCount,
            relationshipId: this.relationshipId,
            updatedAt: new Date().toISOString()
        };
    }
}
