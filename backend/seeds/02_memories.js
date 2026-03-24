export default async function seedMemories(admin, db) {
    console.log('--- Seeding Memories ---');

    // 1. Memory base para el teaser photo counter
    const adminRecord = await admin.auth().getUserByEmail('admin@test.com');
    const adminUid = adminRecord.uid;

    const memoryId1 = 'seed_mem_1';
    await db.collection('memories').doc(memoryId1).set({
        id: memoryId1,
        title: 'Primera cita',
        eventDate: '2022-04-04',
        photoCount: 3,
        mainPhotoUrl: 'dummy',
        tags: ['cita'],
        uploadedBy: adminUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Memories sembradas para pruebas.');
}
