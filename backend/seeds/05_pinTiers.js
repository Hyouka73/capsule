export default async function seedPinTiers(admin, db, relationshipId, adminUid, isFullSeed) {
    if (!isFullSeed) {
        console.log(`--- Skipping PinTiers for ${relationshipId} (Clean State) ---`);
        return;
    }

    console.log(`--- Seeding PinTiers for ${relationshipId} (Full State) ---`);

    const places = [
        { id: 'place_1', name: 'Parque Central', visitCount: 1, lat: 16.7521, lng: -93.1152, tags: ['romántico'], city: 'Tuxtla Gutiérrez', category: 'cita', emoji: '🌳', photoCount: 2, createdBy: adminUid },
        { id: 'place_3', name: 'Plaza Las Flores', visitCount: 5, lat: 16.7551, lng: -93.1182, tags: ['comida'], city: 'Tuxtla Gutiérrez', category: 'cita', emoji: '🛍️', photoCount: 5, createdBy: adminUid },
        { id: 'place_10', name: 'Restaurante El Cielo', visitCount: 12, lat: 16.7611, lng: -93.1242, tags: ['cena'], city: 'Tuxtla Gutiérrez', category: 'cita', emoji: '🕯️', photoCount: 8, createdBy: adminUid },
        { id: 'place_mirador', name: 'Mirador Los Arcos', visitCount: 25, lat: 16.7651, lng: -93.1302, tags: ['vista'], city: 'Tuxtla Gutiérrez', category: 'cita', emoji: '🔭', photoCount: 15, createdBy: adminUid },
        { id: 'place_cine', name: 'Cinepolis Luxury', visitCount: 3, lat: 16.7421, lng: -93.1052, tags: ['cine'], city: 'Tuxtla Gutiérrez', category: 'cita', emoji: '🍿', photoCount: 4, createdBy: adminUid },
    ];

    for (const place of places) {
        const { lat, lng, ...rest } = place;
        const placeData = {
            ...rest,
            coordinates: { lat, lng },
            visitedBy: [
                {
                    relationshipId: relationshipId,
                    count: place.visitCount,
                    timestamp: new Date().toISOString()
                }
            ],
            visitedByRelationshipIds: [relationshipId],
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('places').doc(place.id).set(placeData, { merge: true });
    }

    // Default pin tiers configuration in AppConfig
    const pinTiers = [
        { minVisits: 1, label: 'Bronce', color: '#cd7f32' },
        { minVisits: 5, label: 'Plata', color: '#c0c0c0' },
        { minVisits: 10, label: 'Oro', color: '#ffd700' },
        { minVisits: 20, label: 'Diamante', color: '#b9f2ff' }
    ];

    const memoryTags = [
        { value: 'romántico', label: 'Romántico ❤️' },
        { value: 'comida', label: 'Comida 🍜' },
        { value: 'cena', label: 'Cena 🕯️' },
        { value: 'vista', label: 'Vista 🔭' },
        { value: 'cine', label: 'Cine 🍿' }
    ];

    // ── TARGETED CLEANUP ──
    const configColl = db.collection('relationships').doc(relationshipId).collection('config');
    await configColl.doc('map').delete().catch(() => {});
    console.log(`🧹 Config legacy removed for ${relationshipId}.`);

    const now = admin.firestore.FieldValue.serverTimestamp();

    // 1. Update mapConfig document
    // We update only pinTiers, but using set(merge: true) to keep other mapConfig fields if they exist,
    // though in a full seed they might have just been created by auth.
    await configColl.doc('mapConfig').set({
        pinTiers: pinTiers,
        updatedAt: now
    }, { merge: true });

    // 2. Update memoryTags document
    // Standardize as object-wrapped array for consistency with our new saving logic
    await configColl.doc('memoryTags').set({
        ...memoryTags,
        updatedAt: now
    });

    console.log(`✅ Places, PinTiers y Tags configurados para ${relationshipId}.`);
}
