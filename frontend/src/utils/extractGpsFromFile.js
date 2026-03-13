import exifr from 'exifr';

/**
 * Extract GPS and DateTime from a photo file's EXIF metadata.
 *
 * @param {File} file - Image file from input
 * @returns {Promise<{lat?: number, lng?: number, dateTime?: Date, source?: 'exif'} | null>}
 */
export async function extractMetadataFromFile(file) {
    console.log(`[EXIF] Scanning file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    try {
        // Parse everything (removing pick for better compatibility)
        const exif = await exifr.parse(file, {
            gps: true,
            timestamp: true,
            tiff: true, // Habilitar escaneo profundo de TIFF
            ifd0: true  // Habilitar tags de cabecera estándar
        });

        if (!exif) {
            console.log('[EXIF] No metadata segments found in file.');
            return null;
        }

        // Debug: what did we find actually?
        const keys = Object.keys(exif);
        console.log('[EXIF] Tags found in this file:', keys.join(', '));

        const result = { source: 'exif' };

        // Support for multiple common GPS property names
        const lat = exif.latitude || exif.GPSLatitude;
        const lng = exif.longitude || exif.GPSLongitude;

        if (lat && lng) {
            console.log(`[EXIF] 📍 GPS detected: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            result.lat = lat;
            result.lng = lng;
        } else {
            console.log('[EXIF] ❌ GPS coordinates missing (lat/lng not found in tags).');
        }

        const date = exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate;
        if (date) {
            console.log(`[EXIF] 📅 Date detected: ${new Date(date).toLocaleString()}`);
            result.dateTime = new Date(date);
        } else {
            console.log('[EXIF] ❌ Original date missing in metadata.');
        }

        if (result.lat || result.dateTime) {
            return result;
        }
    } catch (err) {
        console.warn('[EXIF] ⚠️ Extraction error:', err);
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
 * Auto-detect Metadata: try EXIF first for GPS and Date, 
 * then browser fallback for GPS and current time.
 *
 * @param {File} file - First photo file from the selection
 * @returns {Promise<{lat?: number, lng?: number, dateTime?: Date, source: 'exif'|'browser'} | null>}
 */
export async function autoDetectMetadata(file) {
    // 1. Try EXIF data from file
    const exifData = await extractMetadataFromFile(file);
    
    // If we have both, we are gold
    if (exifData?.lat && exifData?.dateTime) return exifData;

    // 2. Fallback for GPS if not in EXIF
    if (!exifData?.lat) {
        const browserCoords = await getBrowserGeolocation();
        if (browserCoords) {
            return {
                ...exifData,
                lat: browserCoords.lat,
                lng: browserCoords.lng,
                dateTime: exifData?.dateTime || new Date(), // Use current time if exif date missing
                source: browserCoords.source
            };
        }
    }

    // If we have at least something from EXIF (like just date)
    if (exifData) return exifData;

    // Last resort: current time and no GPS
    return { dateTime: new Date(), source: 'browser' };
}

// Keep legacy export for compatibility
export const autoDetectGps = autoDetectMetadata;
