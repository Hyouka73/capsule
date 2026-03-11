/**
 * MovieEntry.js
 * Valida y normaliza un registro de película vista antes de IndexedDB.
 */
export default class MovieEntry {
    constructor(data = {}) {
        this.title     = data.title     || null;
        this.tmdbId    = data.tmdbId    || null;
        this.watchDate = data.watchDate || new Date().toISOString().split('T')[0];
        this.placeId   = data.placeId   || null;
        this.rating    = typeof data.rating === 'number' ? data.rating : 0;
        this.posterPath = data.posterPath || null;
        this.overview  = data.overview  || '';
    }

    validate() {
        if (!this.title || typeof this.title !== 'string') {
            throw new Error('MovieEntry: title es obligatorio y debe ser string.');
        }
        if (!this.tmdbId) {
            throw new Error('MovieEntry: tmdbId es obligatorio.');
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(this.watchDate)) {
            throw new Error('MovieEntry: watchDate debe ser YYYY-MM-DD.');
        }
        if (this.rating < 0 || this.rating > 10) {
            throw new Error('MovieEntry: rating debe estar entre 0 y 10.');
        }
    }

    toQueuePayload() {
        this.validate();
        return {
            title:     this.title,
            tmdbId:    this.tmdbId,
            watchDate: this.watchDate,
            placeId:   this.placeId,
            rating:    this.rating,
            posterPath: this.posterPath,
            overview:  this.overview,
        };
    }
}
