export const DB_NAME = 'capsule_offline_queue';
export const DB_VERSION = 6;

/**
 * Abre la base de datos IndexedDB centralizada creando todos los stores necesarios.
 * Garantiza que el esquema esté sincronizado en todos los hooks.
 */
export function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

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
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
