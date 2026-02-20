/**
 * EXIF metadata extractor for photos.
 * Uses the `exifr` library — works in browser and Node.
 *
 * Install: npm install exifr
 * Docs: https://github.com/MikeKovarik/exifr
 */

let exifr = null;

/**
 * Lazy-load exifr to avoid adding it to the initial JS bundle.
 */
async function getExifr() {
    if (!exifr) {
        exifr = await import('exifr');
    }
    return exifr;
}

/**
 * Extract GPS coordinates and capture date from a photo File.
 *
 * @param {File} file - Image file (JPEG, HEIC, PNG, etc.)
 * @returns {Promise<{
 *   lat: number|null,
 *   lng: number|null,
 *   capturedAt: Date|null,
 *   width: number|null,
 *   height: number|null,
 *   hasGps: boolean,
 * }>}
 */
export async function extractExifData(file) {
    const result = {
        lat: null,
        lng: null,
        capturedAt: null,
        width: null,
        height: null,
        hasGps: false,
    };

    try {
        const lib = await getExifr();
        const parsed = await lib.parse(file, {
            // Only parse what we need — keeps it fast
            pick: [
                'GPSLatitude', 'GPSLongitude',
                'GPSLatitudeRef', 'GPSLongitudeRef',
                'DateTimeOriginal', 'CreateDate',
                'ExifImageWidth', 'ExifImageHeight',
                'PixelXDimension', 'PixelYDimension',
            ],
        });

        if (!parsed) return result;

        // GPS
        if (parsed.latitude != null && parsed.longitude != null) {
            result.lat = parsed.latitude;
            result.lng = parsed.longitude;
            result.hasGps = true;
        }

        // Capture date — prefer DateTimeOriginal, fall back to CreateDate
        const rawDate = parsed.DateTimeOriginal ?? parsed.CreateDate;
        if (rawDate) {
            result.capturedAt = exifDateToDate(rawDate);
        }

        // Dimensions
        result.width = parsed.ExifImageWidth ?? parsed.PixelXDimension ?? null;
        result.height = parsed.ExifImageHeight ?? parsed.PixelYDimension ?? null;
    } catch (err) {
        // EXIF parsing is best-effort — never block the upload
        console.warn('[exif] Could not parse EXIF data:', err.message);
    }

    return result;
}

/**
 * Convert EXIF date string ("2024:04:04 20:30:00") to a JS Date.
 * @param {string|Date} rawDate
 * @returns {Date|null}
 */
export function exifDateToDate(rawDate) {
    if (rawDate instanceof Date) return rawDate;
    if (typeof rawDate !== 'string') return null;

    try {
        // EXIF format: "YYYY:MM:DD HH:MM:SS"
        const normalized = rawDate.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
        const date = new Date(normalized);
        return isNaN(date.getTime()) ? null : date;
    } catch {
        return null;
    }
}

/**
 * Quick check: does a file likely contain GPS data?
 * Reads only the first 64KB of the file for speed.
 * @param {File} file
 * @returns {Promise<boolean>}
 */
export async function hasGpsData(file) {
    try {
        const lib = await getExifr();
        const gps = await lib.gps(file);
        return gps != null;
    } catch {
        return false;
    }
}
