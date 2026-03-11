/**
 * ExerciseLog.js
 * Valida y normaliza una entrada de ejercicio antes de IndexedDB.
 */
export default class ExerciseLog {
    constructor(data = {}) {
        this.userId          = data.userId          || null;
        this.workoutDate     = data.workoutDate     || new Date().toISOString().split('T')[0];
        this.notes           = data.notes           || '';
        this.durationMinutes = typeof data.durationMinutes === 'number'
                                ? data.durationMinutes
                                : 0;
    }

    validate() {
        if (!this.userId) {
            throw new Error('ExerciseLog: userId es obligatorio.');
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(this.workoutDate)) {
            throw new Error('ExerciseLog: workoutDate debe ser YYYY-MM-DD.');
        }
        if (this.durationMinutes < 0) {
            throw new Error('ExerciseLog: durationMinutes no puede ser negativo.');
        }
    }

    toQueuePayload() {
        this.validate();
        return {
            userId:          this.userId,
            workoutDate:     this.workoutDate,
            notes:           this.notes,
            durationMinutes: this.durationMinutes,
        };
    }
}
