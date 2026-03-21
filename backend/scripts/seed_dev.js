import admin from 'firebase-admin';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- CONFIGURATION ---
const PROJECT_ID = 'capsule-valentins-day';
const UID = 'kT5JgmEpfMSCi1cMm7cLe1Oonb13'; // From set-admin-claim.js

// Setup Emulator Environment
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';

admin.initializeApp({
    projectId: PROJECT_ID,
    storageBucket: `${PROJECT_ID}.appspot.com`
});

const db = admin.firestore();
const COLLECTIONS = {
    MEMORIES: 'memories',
    PLACES: 'places',
    PHOTOS: 'photos',
    CAPSULES: 'capsules',
    COUPONS: 'coupons',
    BINGO_BOARD: 'bingoBoard',
    INSTANTANEAS: 'instantaneas'
};

const TEASER_DIR = join(__dirname, '../../frontend/public/photos/teaser');
const TEASER_BASE_URL = '/photos/teaser/';

// Get all image files from teaser directory if exists
let allTeaserFiles = [];
if (existsSync(TEASER_DIR)) {
    allTeaserFiles = readdirSync(TEASER_DIR)
        .filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png'))
        .sort();
}

async function clearOldData() {
    console.log('🗑️ Clearing old data...');
    const collections = Object.values(COLLECTIONS);
    for (const col of collections) {
        const snapshot = await db.collection(col).get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }
}

async function seed() {
    try {
        await clearOldData();

        // 1. Places (Tuxtla Gutiérrez)
        console.log('📍 Creating Places...');
        const places = [
            { name: "Parque de la Marimba", lat: 16.7527, lng: -93.1217, category: "parque", emoji: "💃" },
            { name: "Miradores Cañón del Sumidero", lat: 16.7328, lng: -93.0782, category: "naturaleza", emoji: "🏔️" }
        ];

        const placeIds = [];
        for (const p of places) {
            const ref = db.collection(COLLECTIONS.PLACES).doc();
            await ref.set({
                id: ref.id,
                ...p,
                coordinates: new admin.firestore.GeoPoint(p.lat, p.lng),
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            placeIds.push({ id: ref.id, name: p.name, ...p });
        }

        // 2. Memories (3)
        console.log('📸 Creating Memories...');
        const memories = [
            { title: "Noche de Danzón", description: "Escuchamos la marimba y comimos esquites.", eventDate: new Date(), tags: ["cita", "romántico"], place: placeIds[0] },
            { title: "Aventura en el Cañón", description: "La vista más hermosa de Chiapas.", eventDate: new Date(Date.now() - 86400000 * 5), tags: ["viaje"], place: placeIds[1] },
            { title: "Cafecito Mañanero", description: "Pláticas profundas con olor a grano tostado.", eventDate: new Date(Date.now() - 86400000 * 2), tags: ["cita"], place: placeIds[0] }
        ];

        for (let i = 0; i < memories.length; i++) {
            const m = memories[i];
            const ref = db.collection(COLLECTIONS.MEMORIES).doc();
            const photoUrl = allTeaserFiles[i % allTeaserFiles.length] ? `${TEASER_BASE_URL}${allTeaserFiles[i % allTeaserFiles.length]}` : 'https://via.placeholder.com/600';
            
            await ref.set({
                id: ref.id,
                title: m.title,
                description: m.description,
                eventDate: admin.firestore.Timestamp.fromDate(m.eventDate),
                tags: m.tags,
                placeId: m.place.id,
                placeName: m.place.name,
                placeLat: m.place.lat,
                placeLng: m.place.lng,
                mainPhotoUrl: photoUrl,
                photoCount: 1,
                isSpecial: i === 0,
                isHidden: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Sub-collection photo
            await ref.collection(COLLECTIONS.PHOTOS).add({
                url: photoUrl,
                caption: m.title,
                isSnapshot: false, // REQUIRED for getGallery
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // 3. Capsules (3: locked, unlocked, destructible)
        console.log('⏳ Creating Capsules...');
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        const capsules = [
            { title: "Nuestra Próxima Aventura", teaserMessage: "Lee esto cuando estemos en otro país...", unlockDate: futureDate, isUnlocked: false, isViewed: false, autoDestruct: false, isDestructed: false },
            { title: "Un Pequeño Secreto", teaserMessage: "Ya puedes abrirlo ❤️", unlockDate: pastDate, isUnlocked: true, isViewed: false, autoDestruct: false, isDestructed: false },
            { title: "Bomba de Amor", teaserMessage: "¡LEER SOLO UNA VEZ!", unlockDate: pastDate, isUnlocked: true, isViewed: false, autoDestruct: true, isDestructed: false }
        ];

        for (const c of capsules) {
            const ref = db.collection(COLLECTIONS.CAPSULES).doc();
            await ref.set({
                id: ref.id,
                ...c,
                unlockDate: admin.firestore.Timestamp.fromDate(c.unlockDate),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // 4. Bingo Board (1 board with categories)
        console.log('🎯 Creating Bingo Board...');
        const categories = [
            { id: 'musica', label: 'Bailar Danzón', emoji: '💃', suggestedTags: ['baile', 'música', 'danza'], completedMemoryId: 'mock-1' },
            { id: 'comida', label: 'Cena Romántica', emoji: '🕯️', suggestedTags: ['cena', 'cita', 'comida'], completedMemoryId: 'mock-2' },
            { id: 'movies', label: 'Noche de Cine', emoji: '🍿', suggestedTags: ['película', 'cine', 'movie'], completedMemoryId: null },
            { id: 'exercise', label: 'Caminata Juntos', emoji: '🏃‍♂️', suggestedTags: ['ejercicio', 'caminata', 'parque'], completedMemoryId: null },
            { id: 'games', label: 'Tarde de Juegos', emoji: '🎮', suggestedTags: ['juegos', 'diversión', 'gaming'], completedMemoryId: null },
            { id: 'nature', label: 'Aventura Natural', emoji: '🌲', suggestedTags: ['naturaleza', 'viaje', 'bosque'], completedMemoryId: null },
            { id: 'coffee', label: 'Café y Plática', emoji: '☕', suggestedTags: ['café', 'cita'], completedMemoryId: 'mock-3' }
        ];

        // Fill up to 20 categories
        for (let i = categories.length; i < 20; i++) {
            categories.push({
                id: `extra-${i}`,
                label: `Reto Extra ${i + 1}`,
                emoji: '✨',
                suggestedTags: [`extra-${i}`],
                completedMemoryId: null
            });
        }

        await db.collection(COLLECTIONS.BINGO_BOARD).doc('board').set({
            id: 'board',
            categories,
            completedCount: 3,
            totalCount: 20,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 5. Movies (2 with movieData)
        console.log('🍿 Creating Movies...');
        const moviesData = [
            {
                title: "Dune: Part Two",
                tmdbId: 693134,
                posterPath: "/8uS16769J6pXp86YpAL6R7Y4SZy.jpg",
                releaseDate: "2024-02-27",
                rating: 10,
                watchDate: "2024-03-01"
            },
            {
                title: "Poor Things",
                tmdbId: 792307,
                posterPath: "/kSfvS36Z7vSfs6v4Z26ni9G8rU8.jpg",
                releaseDate: "2023-10-24",
                rating: 9,
                watchDate: "2024-01-15"
            }
        ];

        for (const m of moviesData) {
            const ref = db.collection(COLLECTIONS.MEMORIES).doc();
            await ref.set({
                id: ref.id,
                title: m.title,
                eventDate: admin.firestore.Timestamp.fromDate(new Date(m.watchDate)),
                tags: ['Película', 'Cine'],
                movieData: m,
                isSpecial: m.rating >= 9,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // 6. Snapshot (1 archived)
        console.log('📸 Creating Snapshot...');
        const snapRef = db.collection(COLLECTIONS.INSTANTANEAS).doc();
        await snapRef.set({
            id: snapRef.id,
            photoUrl: "https://via.placeholder.com/400",
            message: "¡Foto sorpresa!",
            isSeen: true,
            isArchived: true, // REQUIRED for getGallery
            createdBy: UID,
            createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 86400000 * 10)) // 10 days ago
        });

        // 7. Coupons
        console.log('🎟️ Creating Coupons...');
        const coupons = [
            { title: "Vale por un Masaje", description: "Válido por 30 min de relajación.", type: "massage", status: "active", createdAt: admin.firestore.FieldValue.serverTimestamp() },
            { title: "Cena a Elección", description: "Yo cocino lo que tú quieras.", type: "date_night", status: "active", createdAt: admin.firestore.FieldValue.serverTimestamp() },
            { title: "Pase Libre de Discusión", description: "Úsalo sabiamente...", type: "free_pass", status: "active", createdAt: admin.firestore.FieldValue.serverTimestamp() }
        ];

        for (const cp of coupons) {
            await db.collection(COLLECTIONS.COUPONS).add(cp);
        }

        console.log('✅ Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during seeding:', error);
        process.exit(1);
    }
}

seed();
