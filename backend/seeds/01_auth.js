const RELATIONSHIPS = [
    {
        id: 'capsule_development_rel_1',
        adminEmail: 'admin@test.com',
        adminName: 'Admin Principal'
    },
    {
        id: 'capsule_development_rel_2',
        adminEmail: 'admin2@test.com',
        adminName: 'Admin Secundario'
    }
];

export default async function seedAuth(admin, db) {
    console.log('--- Seeding Multi-Relationship Auth (Modular Config) ---');
    const results = [];

    for (const rel of RELATIONSHIPS) {
        const { id: relId, adminEmail, adminName } = rel;
        let adminUid;

        // 1. Check/create admin user
        try {
            const user = await admin.auth().getUserByEmail(adminEmail);
            adminUid = user.uid;
            console.log(`   - User ${adminEmail} already exists (${adminUid})`);
        } catch (error) {
            const userRecord = await admin.auth().createUser({
                email: adminEmail,
                password: 'password',
                displayName: adminName,
                emailVerified: true
            });
            adminUid = userRecord.uid;
            console.log(`   ✅ Created user: ${adminEmail} (${adminUid})`);
        }

        // 2. Set Custom Claims
        await admin.auth().setCustomUserClaims(adminUid, {
            role: 'admin',
            relationshipId: relId
        });

        // 3. Admin User Document
        await db.collection('users').doc(adminUid).set({
            uid: adminUid,
            email: adminEmail,
            displayName: adminName,
            role: 'admin',
            accountStatus: 'active',
            relationshipId: relId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastActiveAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // 4. Initialize config — each field in its own independent document
        // (config/main NO LONGER EXISTS — every field has its own doc)
        const ts = admin.firestore.FieldValue.serverTimestamp();
        const configColl = db.collection('relationships').doc(relId).collection('config');

        // config/relationship — identity & partner link
        await configColl.doc('relationship').set({
            relationshipId: relId,
            adminUid: adminUid,
            partnerUid: null,
            status: 'active',
            createdAt: ts,
            updatedAt: ts
        }, { merge: true });

        // config/features — feature flags (partner-relevant)
        await configColl.doc('features').set({
            coupons: true, memories: true, bingo: true,
            memoryMap: true, photoGallery: true, timeCapsules: true,
            bingoBoard: true, movieTracking: false, onboarding: false,
            easterEggs: false, games: false, exercise: false,
            updatedAt: ts
        }, { merge: true });

        // config/inviteConfig — invite link (admin only)
        await configColl.doc('inviteConfig').set({
            token: null,
            inviteUrl: null,
            isActive: false,
            createdAt: ts,
            updatedAt: ts
        }, { merge: true });

        results.push({ relationshipId: relId, adminUid });
    }

    console.log(`✅ ${RELATIONSHIPS.length} relaciones administrativas restauradas (Modular Config).`);
    return results;
}
