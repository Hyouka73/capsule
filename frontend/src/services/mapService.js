/**
 * Map Service
 * Utilities for geocoding and map-related API calls.
 *
 * Strategy: "Cascading Zoom Geocoding"
 * ─────────────────────────────────────────────────────────────────────────────
 * Nominatim's zoom parameter controls the granularity of the returned object:
 *
 *   zoom=18  → building / street level  (very precise, but road-biased)
 *   zoom=16  → POI / amenity level      (parks, plazas, stadiums)
 *   zoom=14  → suburb / neighbourhood   (broader fallback)
 *
 * The algorithm:
 *  1. Query zoom=18 → if it returns a clear POI, done.
 *  2. If the primary result is a highway/road, query zoom=16 in parallel
 *     to get the enclosing area (park, leisure, etc.).
 *  3. Pick whichever result has the higher "POI confidence score".
 *  4. If both fail, fall back to display_name[0] as a last resort.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/reverse';

// These categories are "road noise" – when Nominatim returns one of these as
// the primary category, we know we need to look for the enclosing area instead.
const ROAD_CATEGORIES = new Set(['highway', 'railway', 'waterway', 'boundary']);

// Ordered list of address keys that represent meaningful POIs.
// Keys listed first win over keys listed later.
const POI_KEYS = [
    // ── Leisure / outdoors ──────────────────────────────────────────────────
    'leisure',        // park, playground, garden, sports_centre …
    'park',           // sometimes mapped separately
    'garden',
    'natural',        // wood, beach, water …
    // ── Commercial / entertainment ──────────────────────────────────────────
    'amenity',        // restaurant, cafe, cinema, university …
    'tourism',        // hotel, museum, attraction …
    'shop',
    'mall',
    'supermarket',
    'commercial',
    'retail',
    // ── Civic / infrastructure ───────────────────────────────────────────────
    'historic',
    'office',
    'building',
    'house_name',
    // ── Urban fabric (last resort before street) ─────────────────────────────
    'neighbourhood',
    'suburb',
    'quarter',
    'place',
];

/**
 * Assign a confidence score to a parsed geocode result.
 * Higher = more useful for our use-case (POI name > road name).
 */
function poiScore(data) {
    if (!data) return -1;
    if (ROAD_CATEGORIES.has(data.category)) return 0;

    const address = data.address || {};

    // Check if any high-priority POI key has a value
    for (let i = 0; i < POI_KEYS.length; i++) {
        if (address[POI_KEYS[i]]) {
            // Keys near the top of the list score higher
            return POI_KEYS.length - i;
        }
    }

    // Has a display name that doesn't look like a road
    if (data.name && !ROAD_CATEGORIES.has(data.category)) return 1;

    return 0;
}

/**
 * Build a Nominatim reverse-geocode URL.
 */
function buildUrl(lat, lng, zoom) {
    const params = new URLSearchParams({
        format: 'jsonv2',
        lat: String(lat),
        lon: String(lng),
        zoom: String(zoom),
        addressdetails: '1',
        extratags: '1',
        namedetails: '1',
    });
    return `${NOMINATIM_BASE}?${params}`;
}

/**
 * Fetch and parse a single Nominatim response.
 */
async function fetchNominatim(lat, lng, zoom) {
    const res = await fetch(buildUrl(lat, lng, zoom), {
        headers: {
            'Accept-Language': 'es',
            'User-Agent': 'Capsule-App-V1.1',
        },
    });

    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
    return res.json();
}

/**
 * Extract the best human-readable name from a raw Nominatim response.
 */
function extractName(data) {
    if (!data) return null;

    const address = data.address || {};
    const extra   = data.extratags  || {};
    const names   = data.namedetails || {};

    // 1. Walk the priority list
    for (const key of POI_KEYS) {
        if (address[key]) return address[key];
    }

    // 2. Localised / brand name from namedetails / extratags
    const named = names['name:es'] || names['name'] || extra.brand || extra.operator;
    if (named) return named;

    // 3. The raw `name` field Nominatim puts on the matched object
    if (data.name) return data.name;

    // 4. Very last resort: first segment of display_name
    if (data.display_name) return data.display_name.split(',')[0];

    return null;
}

/**
 * Build the optional "(Mall Name)" context suffix.
 * e.g. "Recórcholis (Plaza Cristal)"
 */
function buildContext(address) {
    return (
        address.mall        ||
        address.supermarket ||
        address.commercial  ||
        address.retail      ||
        null
    );
}

// Overpass: busca qué área (parque, plaza, leisure) contiene las coordenadas
async function queryContainingArea(lat, lng) {
    const query = `
        [out:json][timeout:5];
        is_in(${lat},${lng})->.a;
        (
          way(pivot.a)[leisure];
          way(pivot.a)[amenity~"^(park|garden|playground)$"];
          way(pivot.a)[tourism];
          relation(pivot.a)[leisure];
          relation(pivot.a)[amenity~"^(park|garden|playground)$"];
        );
        out tags 1;
    `;
    const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const el = data.elements?.[0]?.tags;
    if (!el) return null;
    return el['name:es'] || el['name'] || null;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Reverse-geocodes a lat/lng pair using a cascading zoom strategy.
 *
 * @param {number|string} lat
 * @param {number|string} lng
 * @returns {Promise<{
 *   name: string,
 *   city: string,
 *   state: string,
 *   category: string,
 *   type: string,
 *   fullAddress: string,
 *   raw: object
 * }|null>}
 */
export async function reverseGeocode(lat, lng) {
    if (lat == null || lng == null) return null;

    try {
        // ── Step 1: Fine-grained query (zoom=18) ────────────────────────────
        const fine = await fetchNominatim(lat, lng, 18);
        const fineScore = poiScore(fine);

        let best = fine;

        // ── Step 2: If the fine result is a road, try area query (zoom=16) ──
        if (ROAD_CATEGORIES.has(fine?.category)) {
            try {
                const area = await fetchNominatim(lat, lng, 16);
                const areaScore = poiScore(area);

                // Only upgrade if the area result is strictly better
                if (areaScore > fineScore) {
                    best = area;
                }
            } catch (innerErr) {
                // Area call failed – stick with the fine result
                console.warn('[mapService] Area zoom call failed, using fine result', innerErr);
            }
        }

        // Si el mejor resultado sigue siendo una calle, preguntarle a Overpass
        // qué polígono contiene las coordenadas
        if (ROAD_CATEGORIES.has(best?.category)) {
            try {
                const areaName = await queryContainingArea(lat, lng);
                if (areaName) {
                    return {
                        name:        areaName.trim(),
                        city:        best.address?.city || best.address?.town || best.address?.suburb || '',
                        state:       best.address?.state || '',
                        category:    'leisure',
                        type:        'park',
                        fullAddress: best.display_name,
                        raw:         best,
                    };
                }
            } catch (overpassErr) {
                console.warn('[mapService] Overpass fallback failed', overpassErr);
            }
        }

        // ── Step 3: Extract name from the winning result ─────────────────────
        const address = best.address || {};
        const poiName  = extractName(best);
        const context  = buildContext(address);

        // Append mall/complex context if relevant
        const finalName =
            poiName && context && poiName !== context
                ? `${poiName} (${context})`
                : (poiName || 'Lugar sin nombre');

        // ── Step 4: Supplementary fields ─────────────────────────────────────
        const city  = address.city  || address.town  || address.village || address.suburb || '';
        const state = address.state || '';

        return {
            name:        finalName.trim(),
            city,
            state,
            category:    best.category,
            type:        best.type,
            fullAddress: best.display_name,
            raw:         best,
        };

    } catch (err) {
        console.error('[mapService] reverseGeocode failed:', err);
        return null;
    }
}
