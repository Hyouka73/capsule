/**
 * Memory Model (Backend)
 * Represents a memory in Firestore.
 */
export default class Memory {
    constructor(data = {}) {
        this.id = data.id || null;
        this.title = data.title || '';
        this.description = data.description || '';

        // Handle Firestore Timestamps or Dates
        this.eventDate = this._toDate(data.eventDate) || new Date();
        this.tags = Array.isArray(data.tags) ? data.tags : [];

        // Geolocation
        this.placeId = data.placeId || null;
        this.placeName = data.placeName || null;
        this.placeLat = data.placeLat !== undefined ? parseFloat(data.placeLat) : null;
        this.placeLng = data.placeLng !== undefined ? parseFloat(data.placeLng) : null;

        // Metadata
        this.photoCount = data.photoCount || 0;
        this.mainPhotoUrl = data.mainPhotoUrl || null;
        this.mainPhotoThumb = data.mainPhotoThumb || null;
        this.mainPhotoDetail = data.mainPhotoDetail || null;
        this.photos = Array.isArray(data.photos) ? data.photos : [];
        this.isSpecial = !!data.isSpecial;
        this.isHidden = !!data.isHidden;
        this.uploadedBy = data.uploadedBy || null;

        // Timestamps
        this.createdAt = this._toDate(data.createdAt);
        this.updatedAt = this._toDate(data.updatedAt);
    }

    /**
     * Helper to normalize Firestore Timestamps or other date formats
     */
    _toDate(val) {
        if (!val) return null;
        if (typeof val.toDate === 'function') return val.toDate();
        return new Date(val);
    }

    /**
     * Convert to a plain object for Firestore storage
     */
    toFirestore() {
        return {
            title: this.title,
            description: this.description,
            eventDate: this.eventDate, // Firestore converts JS Date to Timestamp
            tags: this.tags,
            placeId: this.placeId,
            placeName: this.placeName,
            placeLat: this.placeLat,
            placeLng: this.placeLng,
            photoCount: this.photoCount,
            mainPhotoUrl: this.mainPhotoUrl,
            mainPhotoThumb: this.mainPhotoThumb,
            mainPhotoDetail: this.mainPhotoDetail,
            photos: this.photos,
            isSpecial: this.isSpecial,
            isHidden: this.isHidden,
            uploadedBy: this.uploadedBy,
            createdAt: this.createdAt || new Date(),
            updatedAt: this.updatedAt || new Date(),
        };
    }
}
