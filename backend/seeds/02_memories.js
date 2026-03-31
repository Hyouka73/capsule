export default async function seedMemories(admin, db, relationshipId, adminUid, isFullSeed) {
    if (!isFullSeed) {
        console.log(`--- Skipping Memories for ${relationshipId} (Clean State) ---`);
        return;
    }

    console.log(`--- Seeding Memories for ${relationshipId} (Full State) ---`);

    const memories = [
        {
            id: 'seed_mem_1',
            title: 'Primer Cita en el Parque',
            eventDate: '2022-04-04',
            photoCount: 1,
            mainPhotoUrl: 'https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&q=80&w=400',
            tags: ['cita', 'romántico'],
            placeId: 'place_1',
            placeName: 'Parque Central',
            uploadedBy: adminUid,
            isSpecial: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
            id: 'seed_mem_2',
            title: 'Cita en el Cine',
            eventDate: '2023-05-15',
            photoCount: 2,
            mainPhotoUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=400',
            tags: ['cita', 'cine'],
            placeId: 'place_5',
            placeName: 'Cinepolis Luxury',
            uploadedBy: adminUid,
            isSpecial: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
            id: 'seed_mem_3',
            title: 'Cena de Aniversario',
            eventDate: '2024-02-14',
            photoCount: 3,
            mainPhotoUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=400',
            tags: ['aniversario', 'cena'],
            placeId: 'place_10',
            placeName: 'Restaurante El Cielo',
            uploadedBy: adminUid,
            isSpecial: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
    ];

    const relationshipRef = db.collection('relationships').doc(relationshipId);

    for (const mem of memories) {
        await relationshipRef.collection('memories').doc(mem.id).set(mem);
    }
    
    console.log(`✅ ${memories.length} Memories sembradas para relación: ${relationshipId}`);
}
