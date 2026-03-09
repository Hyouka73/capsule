/**
 * Map Service
 * Utilities for geocoding and map-related API calls.
 */

/**
 * Reverse Geocoding using Nominatim (OpenStreetMap)
 * @param {number|string} lat 
 * @param {number|string} lng 
 * @returns {Promise<object|null>}
 */
export async function reverseGeocode(lat, lng) {
    if (!lat || !lng) return null;

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'Accept-Language': 'es',
                    // Nominatim requires a user-agent to identify the application
                    'User-Agent': 'Capsule-App-V0.1'
                }
            }
        );

        if (!response.ok) throw new Error('Geocoding service error');

        const data = await response.json();

        // Extract the most relevant name
        // data.name is sometimes more specific than the first part of display_name
        const name = data.name || (data.display_name ? data.display_name.split(',')[0] : 'Lugar sin nombre');
        const city = data.address.city || data.address.town || data.address.village || data.address.suburb || '';

        return {
            name,
            city,
            fullAddress: data.display_name,
            raw: data
        };
    } catch (err) {
        console.error('[mapService] Reverse geocode failed:', err);
        return null;
    }
}
