/**
 * Collection names — single source of truth for Firestore.
 */
const COLLECTIONS = {
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

    // System
    ACTIVITY_LOG: 'activityLog',
    APP_CONFIG: 'appConfig',
};

const PARTNER_SINGLETON_ID = 'partner_main';

/**
 * Storage paths — organized by feature.
 */
const STORAGE_PATHS = {
    PHOTO_ORIGINAL: (memoryId, photoId) =>
        `memories/${memoryId}/photos/${photoId}/original.jpg`,
    PHOTO_THUMB: (memoryId, photoId) =>
        `memories/${memoryId}/photos/${photoId}/thumb_400.jpg`
};

/**
 * Capsule content types
 */
const CAPSULE_TYPES = {
    MESSAGE: 'message',
    PHOTO: 'photo',
    LINK: 'link',
    COUPON_REF: 'coupon_ref',
    PDF: 'pdf',
};

/**
 * Capsule unlock triggers
 */
const UNLOCK_TRIGGERS = {
    DATE: 'date',
    MANUAL: 'manual',
};

/**
 * Activity log actions
 */
const ACTIVITY_ACTIONS = {
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
};

/**
 * Artifact types for activity log and navigation
 */
const ARTIFACT_TYPES = {
    MEMORY: 'memory',
    PHOTO: 'photo',
    PLACE: 'place',
    CAPSULE: 'capsule',
    COUPON: 'coupon',
    BINGO: 'bingo',
    WRAPPED: 'wrapped',
};

module.exports = {
    COLLECTIONS,
    STORAGE_PATHS,
    CAPSULE_TYPES,
    UNLOCK_TRIGGERS,
    ACTIVITY_ACTIONS,
    ARTIFACT_TYPES,
    PARTNER_SINGLETON_ID
};
