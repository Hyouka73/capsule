import SystemConfig from '../src/models/SystemConfig.js';

export default async function seedPinTiers(admin, db) {
    console.log('--- Seeding Places for PinTiers ---');

    const config = new SystemConfig();


    const places = [
        { id: 'place_1', name: 'Lugar Tier 1 (1 vis)', visitCount: 1, lat: 16.7521, lng: -93.1152, tags: ['romántico'], city: 'Tuxtla Gutiérrez', category: 'cita', emoji: '📍', photoCount: 0, createdBy: 'seed_admin' },
        { id: 'place_3', name: 'Lugar Tier 2 (3 vis)', visitCount: 3, lat: 16.7551, lng: -93.1182, tags: ['comida'], city: 'Tuxtla Gutiérrez', category: 'cita', emoji: '📍', photoCount: 0, createdBy: 'seed_admin' },
        { id: 'place_5', name: 'Lugar Tier 3 (5 vis)', visitCount: 5, lat: 16.7581, lng: -93.1212, tags: ['cine'], city: 'Tuxtla Gutiérrez', category: 'cita', emoji: '📍', photoCount: 0, createdBy: 'seed_admin' },
        { id: 'place_10', name: 'Lugar Tier 4 (10 vis)', visitCount: 10, lat: 16.7611, lng: -93.1242, tags: ['aventura'], city: 'Tuxtla Gutiérrez', category: 'cita', emoji: '📍', photoCount: 0, createdBy: 'seed_admin' },
        { id: 'place_15', name: 'Lugar Especial (15 vis)', visitCount: 15, lat: 16.7641, lng: -93.1272, tags: ['especial'], city: 'Tuxtla Gutiérrez', category: 'cita', emoji: '📍', photoCount: 0, createdBy: 'seed_admin' },
    ];

    for (const place of places) {
        const { lat, lng, ...rest } = place;
        const placeData = {
            ...rest,
            coordinates: { lat, lng },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        console.log(`Seeding place: ${place.id}`, placeData);
        await db.collection('places').doc(place.id).set(placeData);
    }

    // Configuración de pinTiers por defecto en appConfig/main
    await db.collection('appConfig').doc('main').set({
        mapConfig: {
            pinTiers: config.mapConfig.pinTiers
        }
    }, { merge: true });



    console.log('✅ Places sembradas para pruebas de pinTiers.');
}
