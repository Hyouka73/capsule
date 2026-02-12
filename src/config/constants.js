/**
 * Collection names — single source of truth for all Firestore paths.
 * Using constants prevents typos and makes refactoring easy.
 */

export const COLLECTIONS = {
    // Core data
    MEMORIES: 'memories',
    PHOTOS: 'photos',
    CAPSULES: 'capsules',

    // Features
    BINGO: 'bingo',
    MOVIES: 'movies',
    COUPONS: 'coupons',
    SCRAPBOOK_PAGES: 'scrapbookPages',
    WRAPPED: 'wrapped',

    // System
    APP_CONFIG: 'appConfig',
    USERS: 'users',
};

/**
 * Storage paths — organized by feature
 */
export const STORAGE_PATHS = {
    PHOTOS: (memoryId, filename) => `photos/${memoryId}/${filename}`,
    THUMBNAILS: (memoryId, filename) => `thumbnails/${memoryId}/${filename}`,
    SCRAPBOOK: (pageId, filename) => `scrapbook/${pageId}/${filename}`,
    WRAPPED: (year, filename) => `wrapped/${year}/${filename}`,
};

/**
 * App info constants
 */
export const APP_INFO = {
    NAME: 'Capsule',
    VERSION: '0.2.0',
    ANNIVERSARY_DATE: '2026-04-04T00:00:00-06:00',
    COUPLE_SINCE: '2022-04-04',
};
