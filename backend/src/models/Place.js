/**
 * Place Model (Backend)
 * Represents a location in Firestore.
 */
export default class Place {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.city = data.city || '';
        this.category = data.category || 'otro';
        this.tags = Array.isArray(data.tags) ? data.tags : [];
        this.emoji = data.emoji || '📍';

        // Coordinates
        const coords = data.coordinates || data.location || {};
        this.lat = coords.lat || coords.latitude || null;
        this.lng = coords.lng || coords.longitude || null;

        // Stats
        this.visitCount = data.visitCount || 0;
        this.photoCount = data.photoCount || 0;
        this.coverPhotoUrl = data.coverPhotoUrl || null;

        // Metadata
        this.createdBy = data.createdBy || null;
        this.createdAt = this._toDate(data.createdAt);
        this.updatedAt = this._toDate(data.updatedAt);
    }

    _toDate(val) {
        if (!val) return null;
        if (typeof val.toDate === 'function') return val.toDate();
        return new Date(val);
    }

    toFirestore() {
        return {
            name: this.name,
            city: this.city,
            location: {
                lat: this.lat,
                lng: this.lng
            },
            coordinates: {
                lat: this.lat,
                lng: this.lng
            },
            category: this.category,
            tags: this.tags,
            emoji: this.emoji,
            visitCount: this.visitCount,
            photoCount: this.photoCount,
            coverPhotoUrl: this.coverPhotoUrl,
            createdBy: this.createdBy,
        };
    }
}
