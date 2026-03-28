const TEST_RELATIONSHIP_ID = 'capsule_development_rel_123';

export default async function seedMemories(admin, db) {
    console.log('--- Seeding Memories (Subcollections) ---');

    let adminUid;
    try {
        const adminRecord = await admin.auth().getUserByEmail('admin@test.com');
        adminUid = adminRecord.uid;
    } catch (e) {
        adminUid = 'seed_admin_uid';
    }

    const memories = [
        {
            id: 'seed_mem_1',
            title: 'Primer Cita en el Parque',
            eventDate: '2022-04-04',
            photoCount: 1,
            mainPhotoUrl: 'https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&q=80&w=400',
            tags: ['cita', 'romántico'],
            placeId: 'place_1',
            placeName: 'Lugar Tier 1 (1 vis)',
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
            placeName: 'Lugar Tier 3 (5 vis)',
            uploadedBy: adminUid,
            isSpecial: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
    ];

    const relationshipRef = db.collection('relationships').doc(TEST_RELATIONSHIP_ID);

    for (const mem of memories) {
        await relationshipRef.collection('memories').doc(mem.id).set(mem);
    }
    
    console.log(`✅ Memories sembradas en subcollección para relación: ${TEST_RELATIONSHIP_ID}`);
}
