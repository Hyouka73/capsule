/**
 * BingoAction.js
 * Valida y normaliza los datos antes de entrar a IndexedDB.
 */
export default class BingoAction {
    constructor(data = {}) {
        this.categoryId = data.categoryId !== undefined && data.categoryId !== null ? String(data.categoryId) : null;
        this.memoryId   = data.memoryId   || null;
        this.completedAt = data.completedAt || new Date().toISOString();
    }

    validate() {
        if (!this.categoryId) {
            throw new Error('BingoAction: categoryId es obligatorio.');
        }
    }

    toQueuePayload() {
        this.validate();
        return {
            categoryId:  this.categoryId,
            memoryId:    this.memoryId,
            completedAt: this.completedAt,
        };
    }
}
