export default async function seedPinTiers(admin, db) {
    console.log('--- Seeding Places for PinTiers ---');

    const places = [
        { id: 'place_1', name: 'Lugar Tier 1 (1 vis)', visitCount: 1, lat: 16.7521, lng: -93.1152, tags: ['romántico'] },
        { id: 'place_3', name: 'Lugar Tier 2 (3 vis)', visitCount: 3, lat: 16.7551, lng: -93.1182, tags: ['comida'] },
        { id: 'place_5', name: 'Lugar Tier 3 (5 vis)', visitCount: 5, lat: 16.7581, lng: -93.1212, tags: ['cine'] },
        { id: 'place_10', name: 'Lugar Tier 4 (10 vis)', visitCount: 10, lat: 16.7611, lng: -93.1242, tags: ['aventura'] },
        { id: 'place_15', name: 'Lugar Especial (15 vis)', visitCount: 15, lat: 16.7641, lng: -93.1272, tags: ['especial'] },
    ];

    for (const place of places) {
        const { lat, lng, ...rest } = place;
        await db.collection('places').doc(place.id).set({
            ...rest,
            coordinates: { lat, lng },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    // Configuración de pinTiers por defecto en appConfig/main
    await db.collection('appConfig').doc('main').set({
        mapConfig: {
            pinTiers: [
                { minVisits: 1, color: "#FFB6C1", scale: 1.0 },
                { minVisits: 3, color: "#FF7F7F", scale: 1.3 },
                { minVisits: 5, color: "#FF4444", scale: 1.5 },
                { minVisits: 10, color: "#FFD700", scale: 1.8 }
            ]
        }
    }, { merge: true });

    console.log('✅ Places sembradas para pruebas de pinTiers.');
}
