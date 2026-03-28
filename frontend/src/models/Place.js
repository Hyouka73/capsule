/**
 * Place Model
 * Represents a location (lugar) on the map.
 */
export default class Place {
    constructor(data = {}, currentRelationshipId = null) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.city = data.city || '';
        this.category = data.category || 'otro';
        this.tags = Array.isArray(data.tags) ? data.tags : [];
        this.emoji = data.emoji || '📍';

        // Coordinates (handle multiple formats)
        const latVal = data.lat ?? data.coordinates?.lat ?? data.coordinates?.latitude ?? data.location?.lat ?? null;
        const lngVal = data.lng ?? data.lon ?? data.longitude ?? data.coordinates?.lng ?? data.coordinates?.longitude ?? data.location?.lng ?? null;

        this.lat = latVal !== null ? parseFloat(latVal) : null;
        this.lng = lngVal !== null ? parseFloat(lngVal) : null;

        /**
         * ⚠️ MIGRATION: visitCount is now isolated per relationship in the visitedBy array.
         * Fallback to top-level visitCount for legacy data.
         */
        const relationshipId = currentRelationshipId || localStorage.getItem('capsule_relationship_id');
        const visitedEntry = Array.isArray(data.visitedBy) 
            ? data.visitedBy.find(v => v.relationshipId === relationshipId)
            : null;

        this.visitCount = visitedEntry ? (visitedEntry.count || 0) : (data.visitCount || 0);
        this.photoCount = data.photoCount || 0;
        this.coverPhotoUrl = data.coverPhotoUrl || null;

        // Metadata
        this.createdBy = data.createdBy || null;
        this.createdAt = data.createdAt ? new Date(data.createdAt) : null;
        this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
    }

    static fromFirestore(id, data, currentRelationshipId = null) {
        return new Place({ id, ...data }, currentRelationshipId);
    }

    get coordinates() {
        return { lat: this.lat, lng: this.lng };
    }

    /**
     * Calculates marker style based on visit count and system config tiers.
     * @param {Object} config Map configuration with pinTiers
     * @returns {Object} { color: string, scale: number }
     */
    getMarkerStyle(config) {
        const tiers = config?.pinTiers || [];
        const fallback = { color: "#FFB6C1", scale: 1.0 };
        
        if (tiers.length === 0) return fallback;

        // Find highest matching tier (sorted descending by minVisits)
        const sortedTiers = [...tiers].sort((a, b) => b.minVisits - a.minVisits);
        const match = sortedTiers.find(t => this.visitCount >= t.minVisits);

        return match || fallback;
    }
}

