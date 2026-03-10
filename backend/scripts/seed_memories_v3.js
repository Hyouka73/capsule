import admin from 'firebase-admin';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- CONFIGURATION ---
const serviceAccount = JSON.parse(readFileSync(join(__dirname, '../../serviceAccountKey.json'), 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "capsule-sootty.firebasestorage.app"
});

const db = admin.firestore();
const COLLECTIONS = {
    MEMORIES: 'memories',
    PLACES: 'places',
    PHOTOS: 'photos'
};

const TEASER_DIR = join(__dirname, '../../frontend/public/photos/teaser');
const TEASER_BASE_URL = '/photos/teaser/';

// Get all image files from teaser directory
const allTeaserFiles = readdirSync(TEASER_DIR)
    .filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png'))
    .sort();

const SEED_DATA = [
    {
        place: {
            name: "Parque de la Marimba",
            lat: 16.7527,
            lng: -93.1217,
            category: "parque",
            emoji: "💃"
        },
        memories: [
            {
                title: "Noche de Danzón 💃",
                description: "Escuchamos la marimba y comimos esquites bajo las luces del parque. Un momento mágico.",
                eventDate: "2024-03-01T20:00:00Z",
                tags: ["cita", "romántico"],
                photoFile: allTeaserFiles[0]
            },
            {
                title: "Domingo de Paseo 🌳",
                description: "Caminamos por todo el centro y terminamos aquí descansando de tanto sol.",
                eventDate: "2024-03-05T17:30:00Z",
                tags: ["random", "domingo"],
                photoFile: allTeaserFiles[1]
            }
        ]
    },
    {
        place: {
            name: "Miradores de Chiapa de Corzo",
            lat: 16.7078,
            lng: -93.0023,
            category: "naturaleza",
            emoji: "🏔️"
        },
        memories: [
            {
                title: "Vista al Cañón 🏔️",
                description: "Impresionante la vista desde arriba. Hacía mucho calor pero valió la pena.",
                eventDate: "2024-02-14T12:00:00Z",
                tags: ["viaje", "aniversario"],
                photoFile: allTeaserFiles[2]
            }
        ]
    }
];

async function clearOldData() {
    console.log('🗑️ Clearing old memories and places...');
    const mems = await db.collection(COLLECTIONS.MEMORIES).get();
    const places = await db.collection(COLLECTIONS.PLACES).get();

    // Also clear all photos from collectionGroup theoretically, but for now we just delete parents
    const batch = db.batch();
    mems.docs.forEach(doc => batch.delete(doc.ref));
    places.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
}

async function seed() {
    try {
        await clearOldData();

        for (const entry of SEED_DATA) {
            console.log(`📍 Creating Place: ${entry.place.name}`);
            const placeRef = db.collection(COLLECTIONS.PLACES).doc();
            await placeRef.set({
                id: placeRef.id,
                ...entry.place,
                coordinates: new admin.firestore.GeoPoint(entry.place.lat, entry.place.lng),
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            for (const mem of entry.memories) {
                console.log(`   📸 Creating Memory: ${mem.title} with file ${mem.photoFile}`);
                const memRef = db.collection(COLLECTIONS.MEMORIES).doc();
                const photoUrl = `${TEASER_BASE_URL}${encodeURIComponent(mem.photoFile)}`;
                const photoId = 'photo_' + Math.random().toString(36).substring(7);

                // 1. Create Memory Doc
                await memRef.set({
                    id: memRef.id,
                    title: mem.title,
                    description: mem.description,
                    eventDate: admin.firestore.Timestamp.fromDate(new Date(mem.eventDate)),
                    tags: mem.tags,
                    placeId: placeRef.id,
                    placeName: entry.place.name,
                    placeLat: entry.place.lat,
                    placeLng: entry.place.lng,
                    mainPhotoUrl: photoUrl,
                    photoCount: 1,
                    isSpecial: false,
                    isHidden: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                // 2. Create Photo Sub-document (REQUIRED FOR GALLERY)
                const photoRef = memRef.collection(COLLECTIONS.PHOTOS).doc(photoId);
                await photoRef.set({
                    id: photoId,
                    url: photoUrl,
                    storagePath: `teaser/${mem.photoFile}`,
                    caption: mem.title,
                    isSnapshot: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        console.log('✅ Seeding completed with real teaser filenames!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during seeding:', error);
        process.exit(1);
    }
}

seed();
