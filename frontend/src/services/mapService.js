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

// ─── Cache & Rate Limiting ──────────────────────────────────────────────────
const geocodeCache = new Map();
const CACHE_MAX_SIZE = 100;
const delay = ms => new Promise(r => setTimeout(r, ms));

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
 * Fetch and parse a single Nominatim response with retry logic for 429.
 */
async function fetchNominatim(lat, lng, zoom, isRetry = false) {
    const res = await fetch(buildUrl(lat, lng, zoom), {
        headers: {
            'Accept-Language': 'es',
            'User-Agent': 'Capsule-App-V1.1',
        },
    });

    if (res.status === 429 && !isRetry) {
        console.warn('[mapService] Nominatim 429 (Too Many Requests), retrying in 2s...');
        await delay(2000);
        return fetchNominatim(lat, lng, zoom, true);
    }

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

// Overpass: busca qué área o POI contiene las coordenadas o está cerca
const PRIORITY_TAGS = [
    // Tier 1 — Lugares de entretenimiento y ocio
    'leisure',        // parques, jardines, canchas
    'tourism',        // atracciones, museos, hoteles
    
    // Tier 2 — Gastronomía y vida nocturna
    'amenity',        // filtrado por EXCLUDED_AMENITY
    
    // Tier 3 — Comercio de experiencia
    'shop',           // filtrado por EXCLUDED_SHOP
    
    // Tier 4 — Último recurso
    'historic',
    'building'
];

// Lista NEGRA — estos amenity values se ignoran (utilitarios):
const EXCLUDED_AMENITY = new Set([
    'parking', 'fuel', 'atm', 'bank', 'pharmacy',
    'hospital', 'clinic', 'dentist', 'veterinary',
    'car_wash', 'car_rental', 'bureau_de_change',
    'post_office', 'police', 'fire_station',
    'recycling', 'waste_disposal', 'toilets'
]);

// Lista NEGRA — estos shop values se ignoran:
const EXCLUDED_SHOP = new Set([
    'convenience',    // oxxo, extra
    'supermarket',    // walmart, chedraui
    'gas_station',
    'car',
    'car_repair',
    'tyres',
    'hardware',
    'chemist',
    'laundry',
    'dry_cleaning'
]);

// Palabras clave para excluir por nombre (ej: "Estacionamiento Público")
const EXCLUDED_NAME_WORDS = [
    'estacionamiento', 'parking', 'aparcamiento',
    'cochera', 'garage', 'garaje'
];

async function queryOverpass(lat, lng, radius) {
    const query = `
        [out:json][timeout:10];
        is_in(${lat},${lng})->.contains;
        (
          way(pivot.contains)[name][leisure];
          way(pivot.contains)[name][tourism];
          way(pivot.contains)[name][amenity];
          way(pivot.contains)[name][landuse=recreation_ground];
          relation(pivot.contains)[name][leisure];
          relation(pivot.contains)[name][tourism];
          node(around:${radius},${lat},${lng})[name][amenity];
          node(around:${radius},${lat},${lng})[name][shop];
          node(around:${radius},${lat},${lng})[name][tourism];
          node(around:${radius},${lat},${lng})[name][leisure];
          way(around:${radius},${lat},${lng})[name][amenity];
          way(around:${radius},${lat},${lng})[name][leisure];
          way(around:${radius},${lat},${lng})[name][tourism];
          relation(around:${radius},${lat},${lng})[name][leisure];
          relation(around:${radius},${lat},${lng})[name][tourism];
        );
        out tags 20;
    `;
    const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const elements = data.elements || [];
    if (elements.length === 0) return null;

    // FIX 2 — Priorización de resultados de Overpass
    // Los elementos de is_in (contenedores) vienen primero en el array
    // Les damos prioridad máxima (Score 0)
    const sorted = elements
        .filter(el => {
            const tags = el.tags || {};
            if (!tags.name) return false;

            // Filtro de Lista Negra (utilitarios)
            if (tags.amenity && EXCLUDED_AMENITY.has(tags.amenity)) return false;
            if (tags.shop && EXCLUDED_SHOP.has(tags.shop)) return false;

            // Excluir estacionamientos y nombres vacíos en zonas comerciales
            if (tags.amenity === 'parking') return false;
            
            // Filtro por nombre (ej: "Estacionamiento Público")
            const nameLower = tags.name?.toLowerCase() || '';
            if (EXCLUDED_NAME_WORDS.some(w => nameLower.includes(w))) return false;
            if (nameLower.startsWith('estacionamiento')) return false;
            if (nameLower.startsWith('parking')) return false;

            if (tags.landuse === 'commercial' && !tags.name?.length) return false;

            return true;
        })
        .sort((a, b) => {
            // Identificar si son contenedores basados en el orden original del array de Overpass
            // El union de Overpass preserva el orden: primero is_in, luego around.
            const aIdx = elements.indexOf(a);
            const bIdx = elements.indexOf(b);
            
            // Heurística: si es uno de los primeros elementos y es way/relation,
            // probablemente viene del bloque is_in (contenedor geográfico).
            const aIsContainer = aIdx < 5 && (a.type === 'way' || a.type === 'relation');
            const bIsContainer = bIdx < 5 && (b.type === 'way' || b.type === 'relation');

            if (aIsContainer && !bIsContainer) return -1;
            if (!aIsContainer && bIsContainer) return 1;

            const aScore = PRIORITY_TAGS.findIndex(t => a.tags[t]);
            const bScore = PRIORITY_TAGS.findIndex(t => b.tags[t]);
            const aVal = aScore === -1 ? 999 : aScore;
            const bVal = bScore === -1 ? 999 : bScore;

            if (aVal !== bVal) return aVal - bVal;

            // Tie breaker: el nombre más corto suele ser el más específico/establecimiento
            return (a.tags.name?.length || 0) - (b.tags.name?.length || 0);
        });

    const best = sorted[0]?.tags;
    if (!best) return null;
    return best['name:es'] || best['name'] || null;
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

    // Cache lookup: 4 decimals (~11m precision)
    const cacheKey = `${parseFloat(lat).toFixed(4)},${parseFloat(lng).toFixed(4)}`;
    if (geocodeCache.has(cacheKey)) {
        return geocodeCache.get(cacheKey);
    }

    try {
        // ── Step 1: Fine-grained query (zoom=18) ────────────────────────────
        const fine = await fetchNominatim(lat, lng, 18);
        const fineScore = poiScore(fine);

        let best = fine;

        // ── Step 2: If the fine result is a road, try area query (zoom=16) ──
        if (ROAD_CATEGORIES.has(fine?.category)) {
            try {
                // Respect Nominatim's 1 req/sec policy
                await delay(1100);

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
                // FIX 3 — Radio de búsqueda: 50m inicial, fallback 150m
                let areaName = await queryOverpass(lat, lng, 50);
                if (!areaName) {
                    areaName = await queryOverpass(lat, lng, 150);
                }

                if (areaName) {
                    best = {
                        name:        areaName.trim(),
                        city:        best.address?.city || best.address?.town || best.address?.suburb || '',
                        state:       best.address?.state || '',
                        category:    'leisure',
                        type:        'park',
                        fullAddress: best.display_name,
                        raw:         best,
                        _isAlreadyFormatted: true, // Internal flag
                    };
                    // Skip following name extraction since we already have it
                }
            } catch (overpassErr) {
                console.warn('[mapService] Overpass fallback failed', overpassErr);
            }
        }

        // ── Step 3: Extract name from the winning result ─────────────────────
        let finalResult = null;

        if (best._isAlreadyFormatted) {
            finalResult = { ...best };
            delete finalResult._isAlreadyFormatted;
        } else {
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

            finalResult = {
                name:        finalName.trim(),
                city,
                state,
                category:    best.category,
                type:        best.type,
                fullAddress: best.display_name,
                raw:         best,
            };
        }

        // Store in cache with FIFO eviction
        if (geocodeCache.size >= CACHE_MAX_SIZE) {
            const firstKey = geocodeCache.keys().next().value;
            geocodeCache.delete(firstKey);
        }
        geocodeCache.set(cacheKey, finalResult);

        return finalResult;

    } catch (err) {
        console.error('[mapService] reverseGeocode failed:', err);
        return null;
    }
}
