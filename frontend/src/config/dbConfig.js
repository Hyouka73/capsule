/**
 * ⚠️ MIGRATION NOTE (Sprint 1):
 * Old offline items (without relationshipId prefix) will be orphaned.
 * Users will need to clear browser data or re-sync after this deploy.
 * This is acceptable for v1.0 production readiness.
 * // PM APPROVED: Old offline items will be orphaned (acceptable for v1.0)
 */

export const DB_NAME = 'capsule_offline_queue';
export const DB_VERSION = 11;

/**
 * Genera una llave prefijada por relationshipId para asegurar el aislamiento de datos.
 */
export const getStoreKey = (id, relationshipId) => {
    if (!relationshipId) return id;
    if (String(id).startsWith(relationshipId + '_')) return id;
    return `${relationshipId}_${id}`;
};

/**
 * Abre la base de datos IndexedDB centralizada creando todos los stores necesarios.
 * Garantiza que el esquema esté sincronizado en todos los hooks.
 */
export function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // Si la base de datos está abierta en otra pestaña, este evento se dispara.
        request.onblocked = () => {
            console.warn('[DB] Upgrade blocked! Please close all other tabs of this app.');
            alert('Actualización necesaria. Por favor, cierra otras pestañas de esta App para continuar.');
        };

        request.onupgradeneeded = (e) => {
            const db = e.target.result;

            // 1. Cola de subida (fotos/archivos pesados)
            if (!db.objectStoreNames.contains('upload_queue')) {
                const s = db.createObjectStore('upload_queue', { keyPath: 'id' });
                s.createIndex('status', 'status', { unique: false });
            }

            // 2. Citas pendientes (borradores locales)
            if (!db.objectStoreNames.contains('pending_citas')) {
                db.createObjectStore('pending_citas', { keyPath: 'id' });
            }

            // 3. Acciones pendientes (documentos Firestore ligeros)
            if (!db.objectStoreNames.contains('pending_actions')) {
                const a = db.createObjectStore('pending_actions', { keyPath: 'id' });
                a.createIndex('type', 'type', { unique: false });
                a.createIndex('status', 'status', { unique: false });
            }

            // 4. Caché de la aplicación (Bingo, Ejercicio, Películas)
            if (!db.objectStoreNames.contains('app_cache')) {
                db.createObjectStore('app_cache', { keyPath: 'key' });
            }

            // 5. Bingo Suggestions (Pendientes de resolver offline pos-sync)
            if (!db.objectStoreNames.contains('pending_bingo')) {
                db.createObjectStore('pending_bingo', { keyPath: 'memoryId' });
            }

            // 6. Miniaturas de lugares (Caché local de imágenes)
            if (!db.objectStoreNames.contains('place_thumbnails')) {
                const s = db.createObjectStore('place_thumbnails', { keyPath: 'placeId' });
                s.createIndex('cachedAt', 'cachedAt', { unique: false });
            }

            // 7. Instantáneas vistas (Offline-first)
            if (!db.objectStoreNames.contains('seen_snapshots')) {
                db.createObjectStore('seen_snapshots', { keyPath: 'id' });
            }

            // 8. Caché persistente de Memorias/Citas
            if (!db.objectStoreNames.contains('memories')) {
                const m = db.createObjectStore('memories', { keyPath: 'id' });
                m.createIndex('relationshipId', 'relationshipId', { unique: false });
                m.createIndex('updatedAt', 'updatedAt', { unique: false });
            }

            // 9. Caché de Fotos (Blobs)
            if (!db.objectStoreNames.contains('photo_cache')) {
                db.createObjectStore('photo_cache', { keyPath: 'id' });
            }

            // 10. Caché de Eventos Especiales
            if (!db.objectStoreNames.contains('special_events_cache')) {
                db.createObjectStore('special_events_cache', { keyPath: 'id' });
            }
            
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
