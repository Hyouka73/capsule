/**
 * Collection names — single source of truth for Firestore.
 */
export const COLLECTIONS = {
    // Core data
    USERS: 'users',
    INVITE_TOKENS: 'inviteTokens',
    PLACES: 'places',
    MEMORIES: 'memories',
    PHOTOS: 'photos',           // Subcollection of memories
    ARTIFACTS: 'artifacts',

    // Features
    CAPSULES: 'capsules',
    COUPONS: 'coupons',
    BINGO_BOARD: 'bingoBoard',
    WRAPPED_DATA: 'wrappedData',
    INSTANTANEAS: 'instantaneas', // Added

    // System
    ACTIVITY_LOG: 'activityLog',
    APP_CONFIG: 'appConfig',
};

export const PARTNER_SINGLETON_ID = 'partner_main';

export const STORAGE_PATHS = {
    PHOTO_ORIGINAL: (memoryId, photoId) =>
        `memories/${memoryId}/photos/${photoId}/original.jpg`,
    PHOTO_THUMB: (memoryId, photoId) =>
        `memories/${memoryId}/photos/${photoId}/thumb_400.jpg`
};

export const CAPSULE_TYPES = {
    MESSAGE: 'message',
    PHOTO: 'photo',
    LINK: 'link',
    COUPON_REF: 'coupon_ref',
    PDF: 'pdf',
};

export const UNLOCK_TRIGGERS = {
    DATE: 'date',
    MANUAL: 'manual',
    WEEKLY: 'weekly', // Added
};

export const ACTIVITY_ACTIONS = {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    PHOTO_UPLOADED: 'photo_uploaded',
    MEMORY_CREATED: 'memory_created',
    PHOTO_MARKED_SPECIAL: 'photo_marked_special',
    NOTE_ADDED: 'note_added',
    CAPSULE_OPENED: 'capsule_opened',
    COUPON_USED: 'coupon_used',
    BINGO_COMPLETED: 'bingo_completed',
    WRAPPED_OPENED: 'wrapped_opened',
    SNAPSHOT_SEEN: 'snapshot_seen', // Added
};

export const ARTIFACT_TYPES = {
    TICKET: 'ticket',
    NOTE: 'note',
    PDF: 'pdf',
    OTHER: 'other'
};

export const COUPON_DELIVERY_TYPES = {
    SIMPLE: 'simple',
    EXPIRING: 'expiring',
    GEO: 'geo',
    SCAVENGER: 'scavenger'
};

export const COUPON_CONTENT_TYPES = {
    FREE_PASS: 'free_pass',
    DATE_NIGHT: 'date_night',
    MASSAGE: 'massage',
    WISH: 'wish',
    CUSTOM: 'custom',
};
