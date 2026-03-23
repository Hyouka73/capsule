export default async function seedMemories(admin, db) {
    console.log('--- Seeding Memories ---');

    // 1. Memory base para el teaser photo counter
    const adminRecord = await admin.auth().getUserByEmail('admin@test.com');
    const adminUid = adminRecord.uid;

    const memoryId1 = 'seed_mem_1';
    await db.collection('memories').doc(memoryId1).set({
        id: memoryId1,
        title: 'Primera cita',
        date: '2022-04-04',
        photos: [
            { id: 'p1', url: 'dummy', specialAt: null },
            { id: 'p2', url: 'dummy', specialAt: null },
            { id: 'p3', url: 'dummy', specialAt: null }
        ], // 3 fotos para simular galería
        tags: ['cita'],
        createdBy: adminUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Memories sembradas para pruebas.');
}
