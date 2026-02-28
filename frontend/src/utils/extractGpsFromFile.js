/**
 * extractGpsFromFile — Extracts GPS coordinates from a photo's EXIF data.
 * Falls back to browser geolocation if EXIF doesn't contain GPS.
 *
 * Uses `exifr` for lightweight EXIF parsing (GPS-only).
 */
import exifr from 'exifr';

/**
 * Extract GPS coordinates from a photo file's EXIF metadata.
 * Only parses GPS tags for performance (not full EXIF).
 *
 * @param {File} file - Image file from input
 * @returns {Promise<{lat: number, lng: number, source: 'exif'} | null>}
 */
export async function extractGpsFromFile(file) {
    try {
        const gps = await exifr.gps(file);
        if (gps?.latitude && gps?.longitude) {
            return {
                lat: gps.latitude,
                lng: gps.longitude,
                source: 'exif',
            };
        }
    } catch {
        // File doesn't have EXIF or parsing failed — silently continue
    }
    return null;
}

/**
 * Fallback: get current position from browser's Geolocation API.
 * Times out after 10 seconds. Returns null on failure or denial.
 *
 * @returns {Promise<{lat: number, lng: number, source: 'browser'} | null>}
 */
export function getBrowserGeolocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            return resolve(null);
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    source: 'browser',
                });
            },
            () => resolve(null),
            { timeout: 10000, enableHighAccuracy: false }
        );
    });
}

/**
 * Auto-detect GPS: try EXIF first, then browser geolocation.
 *
 * @param {File} file - First photo file from the selection
 * @returns {Promise<{lat: number, lng: number, source: 'exif'|'browser'} | null>}
 */
export async function autoDetectGps(file) {
    // 1. Try EXIF data from file
    const exifCoords = await extractGpsFromFile(file);
    if (exifCoords) return exifCoords;

    // 2. Fallback to browser geolocation
    const browserCoords = await getBrowserGeolocation();
    return browserCoords;
}
