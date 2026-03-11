/**
 * Memory Model
 * Represents a memory (recuerdo) in the system.
 */
export default class Memory {
    constructor(data = {}) {
        this.id = data.id || null;
        this.title = data.title || '';
        this.description = data.description || '';
        this.eventDate = data.eventDate ? new Date(data.eventDate) : new Date();
        this.tags = Array.isArray(data.tags) ? data.tags : [];

        // Geolocation
        this.placeId = data.placeId || null;
        this.placeName = data.placeName || null;

        const parseCoord = (val) => {
            if (val === null || val === undefined || val === '') return null;
            const parsed = typeof val === 'number' ? val : parseFloat(val);
            return isNaN(parsed) ? null : parsed;
        };

        this.placeLat = parseCoord(data.placeLat);
        this.placeLng = parseCoord(data.placeLng);

        // Metadata
        this.photoCount = data.photoCount || 0;
        this.mainPhotoUrl = data.mainPhotoUrl || null;
        this.isSpecial = !!data.isSpecial;
        this.isHidden = !!data.isHidden;
        this.uploadedBy = data.uploadedBy || null;

        // Timestamps (from Firestore)
        this.createdAt = data.createdAt ? new Date(data.createdAt) : null;
        this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
    }

    /**
     * Map from form data to Model
     */
    static fromForm(formData) {
        return new Memory({
            id: formData.id,
            title: formData.title,
            description: formData.comments || formData.description,
            eventDate: formData.eventDate,
            tags: formData.tags,
            placeId: formData.placeId === 'custom_map' ? null : formData.placeId,
            placeLat: formData.customLocation?.lat || formData.placeLat,
            placeLng: formData.customLocation?.lng || formData.placeLng,
            placeName: formData.placeName || null,
        });
    }

    /**
     * Convert to simple object for API calls (Backend BFF expects this)
     */
    toApiPayload() {
        return {
            title: this.title,
            description: this.description,
            eventDate: this.eventDate instanceof Date ? this.eventDate.toISOString() : this.eventDate,
            tags: this.tags,
            placeId: this.placeId,
            placeName: this.placeName,
            placeLat: this.placeLat,
            placeLng: this.placeLng,
            isSpecial: this.isSpecial,
            isHidden: this.isHidden,
        };
    }
}
