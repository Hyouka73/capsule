/**
 * Place Model
 * Represents a location (lugar) on the map.
 */
export default class Place {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.city = data.city || '';
        this.category = data.category || 'otro';
        this.tags = Array.isArray(data.tags) ? data.tags : [];
        this.emoji = data.emoji || '📍';

        // Coordinates (handle multiple formats: top-level, coordinates object, or location object)
        const latVal = data.lat ?? data.coordinates?.lat ?? data.coordinates?.latitude ?? data.location?.lat ?? null;
        const lngVal = data.lng ?? data.lon ?? data.longitude ?? data.coordinates?.lng ?? data.coordinates?.longitude ?? data.location?.lng ?? null;

        this.lat = latVal !== null ? parseFloat(latVal) : null;
        this.lng = lngVal !== null ? parseFloat(lngVal) : null;

        // Stats
        this.visitCount = data.visitCount || 0;
        this.photoCount = data.photoCount || 0;
        this.coverPhotoUrl = data.coverPhotoUrl || null;

        // Metadata
        this.createdBy = data.createdBy || null;
        this.createdAt = data.createdAt ? new Date(data.createdAt) : null;
        this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
    }

    static fromFirestore(id, data) {
        return new Place({ id, ...data });
    }

    get coordinates() {
        return { lat: this.lat, lng: this.lng };
    }
}
