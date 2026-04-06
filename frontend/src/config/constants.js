/**
 * Frontend Constants
 */

export const COLLECTIONS = {
    USERS: 'users',
    RELATIONSHIPS: 'relationships',
    INVITE_TOKENS: 'inviteTokens',
    PLACES: 'places',
    MEMORIES: 'memories',
    PHOTOS: 'photos',
    ARTIFACTS: 'artifacts',
    CAPSULES: 'capsules',
    COUPONS: 'coupons',
    BINGO_BOARD: 'bingoBoards',
    WRAPPED_DATA: 'wrappedData',
    ACTIVITY_LOG: 'activityLogs',
    APP_CONFIG: 'appConfig',
    INSTANTANEAS: 'snapshots',
    BINGO_HISTORY: 'bingoHistory',
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
    WEEKLY: 'weekly',
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
    SNAPSHOT_SEEN: 'snapshot_seen',
};

export const ARTIFACT_TYPES = {
    TICKET: 'ticket',
    NOTE: 'note',
    PDF: 'pdf',
    OTHER: 'other'
};

export const ROLES = {
    ADMIN: 'admin',
    PARTNER: 'partner',
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

export const MEMORY_TAGS = {
    VIAJE: { value: 'viaje', label: 'Viaje ✈️' },
    CITA: { value: 'cita', label: 'Cita 🍷' },
    ANIVERSARIO: { value: 'aniversario', label: 'Aniversario 💝' },
    RANDOM: { value: 'random', label: 'Random 🤪' },
    LOGRO: { value: 'logro', label: 'Logro 🎯' },
    HITO: { value: 'hito', label: 'Hito 🌟' },
    FAMILIA: { value: 'familia', label: 'Familia 👨‍👩‍👦' },
    AMIGOS: { value: 'amigos', label: 'Amigos 👯‍♂️' },
    CINE: { value: 'cine', label: 'Cine 🍿' },
    COMIDA: { value: 'comida', label: 'Comida 🍝' },
    AVENTURA: { value: 'aventura', label: 'Aventura 🌲' },
    MUSICA: { value: 'musica', label: 'Música 🎵' },
    RELAX: { value: 'relax', label: 'Relax 💆‍♂️' },
    DEPORTE: { value: 'deporte', label: 'Deporte 🏃‍♀️' },
    ARTE: { value: 'arte', label: 'Arte 🎨' },
    CASA: { value: 'casa', label: 'En Casa 🏠' }
};

export const MEMORY_TAGS_OPTIONS = Object.values(MEMORY_TAGS);

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

export const STORAGE_PATHS = {
    // Standardized: [type]/[entityId]/[fileId].webp
    PHOTO_ORIGINAL: (memoryId, photoId) => `memories/${memoryId}/${photoId}.webp`,
    PHOTO_THUMB: (memoryId, photoId) => `memories/${memoryId}/thumb_${photoId}.webp`,
    SNAPSHOT_ORIGINAL: (relationshipId, snapshotId) => `${relationshipId}/snapshots/${snapshotId}.webp`,
    SNAPSHOT_THUMB: (relationshipId, snapshotId) => `${relationshipId}/snapshots/thumb_${snapshotId}.webp`,
    CAPSULE_ORIGINAL: (relationshipId, capsuleId, fileId) => `${relationshipId}/capsules/${capsuleId}/${fileId}.webp`
};

export const SINGLETON_DOCS = {
    APP_CONFIG: 'main',
    BINGO_BOARD: 'board',
};
