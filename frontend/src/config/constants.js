/**
 * Frontend Constants
 */

export const COLLECTIONS = {
    USERS: 'users',
    INVITE_TOKENS: 'inviteTokens',
    PLACES: 'places',
    MEMORIES: 'memories',
    PHOTOS: 'photos',
    ARTIFACTS: 'artifacts',
    CAPSULES: 'capsules',
    COUPONS: 'coupons',
    BINGO_BOARD: 'bingoBoard',
    WRAPPED_DATA: 'wrappedData',
    ACTIVITY_LOG: 'activityLog',
    APP_CONFIG: 'appConfig',
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
};

export const ARTIFACT_TYPES = {
    MEMORY: 'memory',
    PHOTO: 'photo',
    PLACE: 'place',
    CAPSULE: 'capsule',
    COUPON: 'coupon',
    BINGO: 'bingo',
    WRAPPED: 'wrapped',
};

export const ROLES = {
    ADMIN: 'admin',
    PARTNER: 'partner',
};

export const COUPON_TYPES = {
    FREE_PASS: 'free_pass',
    DATE_NIGHT: 'date_night',
    MASSAGE: 'massage',
    WISH: 'wish',
};

export const MEMORY_TAGS = [
    'Viaje ✈️',
    'Cita 🍷',
    'Aniversario 💝',
    'Random 🤪',
    'Logro 🎯',
    'Hito 🌟',
    'Familia 👨‍👩‍👦',
    'Amigos 👯‍♂️'
];

export const PLACE_CATEGORIES = {
    RESTAURANTE: 'restaurante',
    CAFE: 'café',
    PARQUE: 'parque',
    CINE: 'cine',
    HOTEL: 'hotel',
    CIUDAD: 'ciudad',
    NATURALEZA: 'naturaleza',
    OTRO: 'otro'
};

export const SINGLETON_DOCS = {
    APP_CONFIG: 'main',
};
