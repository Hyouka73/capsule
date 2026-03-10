import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(readFileSync(path.join(__dirname, '../../serviceAccountKey.json'), 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Photos available in teaser
const TEASER_PHOTOS = [
    "WhatsApp Image 2026-02-13 at 5.34.30 PM (1).jpeg",
    "WhatsApp Image 2026-02-13 at 5.34.30 PM (2).jpeg",
    "WhatsApp Image 2026-02-13 at 5.34.30 PM.jpeg",
    "WhatsApp Image 2026-02-13 at 5.34.31 PM (1).jpeg",
    "WhatsApp Image 2026-02-13 at 5.34.31 PM.jpeg",
    "WhatsApp Image 2026-02-13 at 5.34.32 PM (1).jpeg",
    "WhatsApp Image 2026-02-13 at 5.34.32 PM (2).jpeg",
    "WhatsApp Image 2026-02-13 at 5.34.32 PM (3).jpeg",
    "WhatsApp Image 2026-02-13 at 5.34.32 PM.jpeg",
    "WhatsApp Image 2026-02-13 at 5.34.33 PM (1).jpeg",
    "WhatsApp Image 2026-02-13 at 5.34.33 PM (2).jpeg",
    "WhatsApp Image 2026-02-13 at 5.34.33 PM (3).jpeg",
    "WhatsApp Image 2026-02-13 at 5.34.33 PM.jpeg",
    "WhatsApp Image 2026-02-13 at 5.34.34 PM.jpeg",
    "WhatsApp Image 2026-02-13 at 5.34.35 PM.jpeg",
    "WhatsApp Image 2026-02-13 at 5.34.37 PM.jpeg",
    "WhatsApp Image 2026-02-13 at 5.34.38 PM.jpeg",
    "WhatsApp Image 2026-02-13 at 5.34.39 PM (1).jpeg",
    "WhatsApp Image 2026-02-13 at 5.34.39 PM.jpeg",
    "WhatsApp Image 2026-02-13 at 5.34.40 PM (1).jpeg",
    "WhatsApp Image 2026-02-13 at 5.34.40 PM.jpeg"
].map(f => `/photos/teaser/${encodeURIComponent(f)}`);

async function seed() {
    console.log('🚀 Iniciando seeding de memorias con fotos teaser...');

    // Limpiar colecciones
    const collectionsToClear = ['places', 'memories'];
    for (const coll of collectionsToClear) {
        const snap = await db.collection(coll).get();
        const batch = db.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`🗑️ Limpiada colección: ${coll}`);
    }

    const places = [
        {
            id: 'place_marimba',
            name: 'Parque de la Marimba',
            city: 'Tuxtla Gutiérrez',
            emoji: '💃',
            category: 'romántico',
            tags: ['romántico', 'fiesta'],
            coordinates: new admin.firestore.GeoPoint(16.7527, -93.1206),
            visitCount: 3
        },
        {
            id: 'place_kristal',
            name: 'Plaza Kristal',
            city: 'Tuxtla Gutiérrez',
            emoji: '🍿',
            category: 'cine',
            tags: ['cine', 'todos'],
            coordinates: new admin.firestore.GeoPoint(16.7485, -93.1365),
            visitCount: 2
        },
        {
            id: 'place_pichanchas',
            name: 'Las Pichanchas',
            city: 'Tuxtla Gutiérrez',
            emoji: '🍲',
            category: 'comida',
            tags: ['comida', 'romántico'],
            coordinates: new admin.firestore.GeoPoint(16.7533, -93.1165),
            visitCount: 1
        }
    ];

    for (const p of places) {
        await db.collection('places').doc(p.id).set({
            ...p,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    console.log('✅ Lugares creados.');

    const memories = [
        // MARIMBA Memories (3)
        {
            title: 'Tarde de Baile',
            description: 'Bailamos hasta que nos dolieron los pies con la marimba de fondo. ¡Qué noche tan mágica!',
            eventDate: new Date('2025-02-14'),
            placeId: 'place_marimba',
            placeName: 'Parque de la Marimba',
            tags: ['romántico', 'fiesta'],
            mainPhotoUrl: TEASER_PHOTOS[0],
            photos: [TEASER_PHOTOS[0], TEASER_PHOTOS[1], TEASER_PHOTOS[2]],
            photoCount: 3
        },
        {
            title: 'Elotes Ricos',
            description: 'Nos comimos unos elotes con harto chile del que pica. ¡Casi lloro! jajaja',
            eventDate: new Date('2025-02-28'),
            placeId: 'place_marimba',
            placeName: 'Parque de la Marimba',
            tags: ['comida'],
            mainPhotoUrl: TEASER_PHOTOS[3],
            photos: [TEASER_PHOTOS[3], TEASER_PHOTOS[4]],
            photoCount: 2
        },
        {
            title: 'Nuestra Primera Vez Aquí',
            description: 'Recordando cuando me pediste que fuera tu novia en este parque. El lugar más especial.',
            eventDate: new Date('2024-11-20'),
            placeId: 'place_marimba',
            placeName: 'Parque de la Marimba',
            tags: ['romántico'],
            mainPhotoUrl: TEASER_PHOTOS[5],
            photos: [TEASER_PHOTOS[5]],
            photoCount: 1
        },
        // KRISTAL Memories (2)
        {
            title: 'Viendo Intensa-Mente 2',
            description: 'Lloramos los dos con Ansiedad, jaja. Estuvo increíble la movie.',
            eventDate: new Date('2025-03-01'),
            placeId: 'place_kristal',
            placeName: 'Plaza Kristal',
            tags: ['cine'],
            mainPhotoUrl: TEASER_PHOTOS[6],
            photos: [TEASER_PHOTOS[6], TEASER_PHOTOS[7], TEASER_PHOTOS[8]],
            photoCount: 3
        },
        {
            title: 'Noche de Estreno',
            description: 'Fuimos a ver la de Marvel. Me encantó compartir palomitas contigo.',
            eventDate: new Date('2025-01-15'),
            placeId: 'place_kristal',
            placeName: 'Plaza Kristal',
            tags: ['cine', 'todos'],
            mainPhotoUrl: TEASER_PHOTOS[9],
            photos: [TEASER_PHOTOS[9]],
            photoCount: 1
        },
        // PICHANCHAS (1)
        {
            title: 'Comida Chiapaneca',
            description: 'Ese cochito horneado estaba para morirse. ¡Y el mezcal ni se diga!',
            eventDate: new Date('2025-03-05'),
            placeId: 'place_pichanchas',
            placeName: 'Las Pichanchas',
            tags: ['comida', 'romántico'],
            mainPhotoUrl: TEASER_PHOTOS[10],
            photos: [TEASER_PHOTOS[10], TEASER_PHOTOS[11], TEASER_PHOTOS[12], TEASER_PHOTOS[13]],
            photoCount: 4
        }
    ];

    for (const m of memories) {
        const ref = db.collection('memories').doc();
        await ref.set({
            ...m,
            isHidden: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    console.log('✨ Seeding completado con éxito.');
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Error en el seeding:', err);
    process.exit(1);
});
