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
    BINGO_BOARD: 'bingoBoards',
    BINGO_HISTORY: 'bingoHistory',
    WRAPPED_DATA: 'wrappedData',
    INSTANTANEAS: 'snapshots', // Added

    // System
    ACTIVITY_LOG: 'activityLogs',
    APP_CONFIG: 'appConfig',
    REDEMPTIONS: 'redemptions', // Added for approval flow
};

export const SINGLETON_DOCS = {
    // Core relationship metadata (replaces old 'main')
    RELATIONSHIP:   'relationship',
    // Config domains — each is an independent document
    FEATURES:       'features',
    VISIBILITY:     'visibility',
    NOTIFICATIONS:  'notifications',
    INVITE_CONFIG:  'inviteConfig',
    ONBOARDING:     'onboarding',
    MEMORY_TAGS:    'memoryTags',
    // Already-modular docs (unchanged)
    BINGO_BOARD:    'board',
    TEASER_CONFIG:  'teaser',
    MAP_CONFIG:     'map',
    MODULES_CONFIG: 'modules',
    PARTNER_CONFIG: 'partner',
    WRAPPED_CONFIG: 'wrapped',
    MULTIMEDIA:     'multimedia'
};

// export const PARTNER_SINGLETON_ID = 'partner_main'; // Deprecated: Use role-based search instead

export const STORAGE_PATHS = {
    PHOTO_ORIGINAL: (memoryId, photoId) => `memories/${memoryId}/${photoId}.jpg`,
    PHOTO_THUMB: (memoryId, photoId) => `memories/${memoryId}/thumb_${photoId}.jpg`,
    SNAPSHOT_ORIGINAL: (relationshipId, snapshotId) => `${relationshipId}/snapshots/${snapshotId}.jpg`,
    SNAPSHOT_THUMB: (relationshipId, snapshotId) => `${relationshipId}/snapshots/thumb_${snapshotId}.jpg`,
    CAPSULE_ORIGINAL: (relationshipId, capsuleId, fileId) => `${relationshipId}/capsules/${capsuleId}/${fileId}.webp`
};

export const CAPSULE_DESTRUCTION_WINDOW_MS = 24 * 60 * 60 * 1000;

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
    COUPON_CREATED: 'coupon_created',
    COUPON_REQUESTED: 'coupon_requested',
    COUPON_APPROVED: 'coupon_approved',
    COUPON_POSTPONED: 'coupon_postponed',
    COUPON_CLAIMED: 'coupon_claimed',
    BINGO_COMPLETED: 'bingo_completed',
    WRAPPED_OPENED: 'wrapped_opened',
    SNAPSHOT_CREATED: 'snapshot_created', // Fixed missing constant
    SNAPSHOT_SEEN: 'snapshot_seen',
    CAPSULE_CREATED: 'capsule_created',
    PLACE_CREATED: 'place_created',
    RELATIONSHIP_CREATED: 'relationship_created',
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
