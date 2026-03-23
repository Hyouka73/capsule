export default async function seedCapsules(admin, db) {
    console.log('--- Seeding Capsules ---');
    
    // Admin needed as creator
    const adminRecord = await admin.auth().getUserByEmail('admin@test.com');
    const adminUid = adminRecord.uid;

    const now = new Date();
    const future30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const future7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const capsules = [
        {
            id: 'locked-message',
            type: 'message',
            title: 'Una sorpresa especial',
            teaserMessage: 'No abras esto hasta estar sola... 🤫',
            message: null,
            isUnlocked: false, isDestructed: false, isViewed: false,
            unlockTrigger: 'date',
            unlockDate: admin.firestore.Timestamp.fromDate(future30),
            autoDestruct: false, hasAttachments: false, notifyOnUnlock: true,
            createdBy: adminUid
        },
        {
            id: 'locked-soon',
            type: 'message', 
            title: 'Para el próximo viernes',
            teaserMessage: 'Algo especial se acerca... ✨',
            message: null,
            isUnlocked: false, isDestructed: false, isViewed: false,
            unlockTrigger: 'date',
            unlockDate: admin.firestore.Timestamp.fromDate(future7),
            autoDestruct: false, hasAttachments: false, notifyOnUnlock: true,
            createdBy: adminUid
        },
        {
            id: 'unlocked-message',
            type: 'message',
            title: 'Te amo mucho',
            teaserMessage: 'Un mensaje desde el corazón 💕',
            message: 'Eres lo mejor que me ha pasado en la vida. Cada día contigo es un regalo. 💕',
            isUnlocked: true, isDestructed: false, isViewed: false,
            unlockTrigger: 'date',
            unlockDate: admin.firestore.Timestamp.fromDate(now),
            unlockedAt: admin.firestore.Timestamp.fromDate(now),
            autoDestruct: false, hasAttachments: false, notifyOnUnlock: true,
            createdBy: adminUid
        },
        {
            id: 'autodestruct-message',
            type: 'message',
            title: 'Un secreto',
            teaserMessage: 'Desaparecerá al leerlo 🔥',
            message: 'Te amo más que a nada en este mundo. Esto es solo para ti.',
            isUnlocked: true, isDestructed: false, isViewed: false,
            unlockTrigger: 'manual',
            unlockDate: null,
            unlockedAt: admin.firestore.Timestamp.fromDate(now),
            autoDestruct: true, hasAttachments: false,
            notifyOnUnlock: true,
            createdBy: adminUid
        }
    ];

    const batch = db.batch();
    
    // Wipe existing capsules (clean slate for this collection logic)
    const existing = await db.collection('capsules').get();
    existing.docs.forEach(doc => batch.delete(doc.ref));

    for (const cap of capsules) {
        const { id, ...data } = cap;
        const ref = db.collection('capsules').doc(id);
        batch.set(ref, {
            ...data,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    
    await batch.commit();
    console.log(`✅ ${capsules.length} cápsulas creadas.`);
}
