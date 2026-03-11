/**
 * BingoAction.js
 * Valida y normaliza los datos antes de entrar a IndexedDB.
 */
export default class BingoAction {
    constructor(data = {}) {
        this.categoryId = data.categoryId || null;
        this.memoryId   = data.memoryId   || null;
        this.completedAt = data.completedAt || new Date().toISOString();
    }

    validate() {
        if (!this.categoryId || typeof this.categoryId !== 'string') {
            throw new Error('BingoAction: categoryId es obligatorio y debe ser string.');
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
