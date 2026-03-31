export default async function seedCapsules(admin, db, relationshipId, adminUid, isFullSeed) {
    if (!isFullSeed) {
        console.log(`--- Skipping Capsules for ${relationshipId} (Clean State) ---`);
        return;
    }

    console.log(`--- Seeding Capsules for ${relationshipId} (Full State) ---`);
    
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
            createdBy: adminUid,
            relationshipId: relationshipId
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
            createdBy: adminUid,
            relationshipId: relationshipId
        }
    ];

    const relRef = db.collection('relationships').doc(relationshipId);
    const capsCollection = relRef.collection('capsules');

    const batch = db.batch();
    
    // Wipe existing capsules in subcollection
    const existing = await capsCollection.get();
    existing.docs.forEach(doc => batch.delete(doc.ref));

    for (const cap of capsules) {
        const { id, ...data } = cap;
        const ref = capsCollection.doc(id);
        batch.set(ref, {
            ...data,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    
    await batch.commit();
    console.log(`✅ ${capsules.length} cápsulas creadas para ${relationshipId}.`);
}
