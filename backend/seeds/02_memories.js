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
            photoCount: 3,
            mainPhotoUrl: 'https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&q=80&w=400',
            tags: ['cita', 'romántico'],
            placeId: 'place_1',
            placeName: 'Parque Central',
            uploadedBy: adminUid,
            relationshipId: relationshipId,
            isSpecial: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            photos: [
                { id: '1a', url: 'https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&q=80&w=400', isMain: true },
                { id: '1b', url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=400', isMain: false },
                { id: '1c', url: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=80&w=400', isMain: false }
            ]
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
            relationshipId: relationshipId,
            isSpecial: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            photos: [
                { id: '2a', url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=400', isMain: true },
                { id: '2b', url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=400', isMain: false }
            ]
        },
        {
            id: 'seed_mem_3',
            title: 'Cena de Aniversario',
            eventDate: '2024-02-14',
            photoCount: 4,
            mainPhotoUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=400',
            tags: ['aniversario', 'cena'],
            placeId: 'place_10',
            placeName: 'Restaurante El Cielo',
            uploadedBy: adminUid,
            relationshipId: relationshipId,
            isSpecial: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            photos: [
                { id: '3a', url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=400', isMain: true },
                { id: '3b', url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=400', isMain: false },
                { id: '3c', url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=400', isMain: false },
                { id: '3d', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=400', isMain: false }
            ]
        }
    ];

    const relationshipRef = db.collection('relationships').doc(relationshipId);

    for (const mem of memories) {
        const memRef = relationshipRef.collection('memories').doc(mem.id);
        const memData = { ...mem };
        delete memData.photos; // The array stays on the doc, wait, we DO want it on the doc too so getGallery fetches it fast.
        
        await memRef.set(mem);
        
        // Also seed the subcollection for robust dynamic fetching
        for (const p of mem.photos) {
            await memRef.collection('photos').doc(p.id).set({
                ...p,
                isProcessed: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }
    
    console.log(`✅ ${memories.length} Memories sembradas con múltiples fotos para la relación: ${relationshipId}`);
}
