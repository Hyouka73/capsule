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
    console.log('--- Seeding Multi-Relationship Auth ---');
    const results = [];

    for (const rel of RELATIONSHIPS) {
        const { id: relId, adminEmail, adminName } = rel;
        let adminUid;

        try {
            // Check if user exists
            const user = await admin.auth().getUserByEmail(adminEmail);
            adminUid = user.uid;
            console.log(`   - User ${adminEmail} already exists (${adminUid})`);
        } catch (error) {
            // Create user
            const userRecord = await admin.auth().createUser({
                email: adminEmail,
                password: 'password',
                displayName: adminName,
                emailVerified: true
            });
            adminUid = userRecord.uid;
            console.log(`   ✅ Created user: ${adminEmail} (${adminUid})`);
        }

        // Set Custom Claims (Admin + Relationship ID)
        await admin.auth().setCustomUserClaims(adminUid, {
            role: 'admin',
            relationshipId: relId
        });
        console.log(`   🎯 Set claims for ${adminEmail}: rel=${relId}`);

        // Initialize User Document
        const userRef = db.collection('users').doc(adminUid);
        await userRef.set({
            uid: adminUid,
            email: adminEmail,
            displayName: adminName,
            role: 'admin',
            accountStatus: 'active',
            relationshipId: relId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
            preferences: { theme: 'dark', language: 'es' }
        }, { merge: true });

        // Initialize AppConfig in a multi-doc structure
        const configColl = db.collection('relationships').doc(relId).collection('config');
        const batch = db.batch();
        const now = admin.firestore.FieldValue.serverTimestamp();

        // 1. main document
        batch.set(configColl.doc('main'), {
            relationshipId: relId,
            adminUid: adminUid,
            partnerUid: null,
            status: 'active',
            features: {
                memoryMap: true,
                photoGallery: true,
                timeCapsules: true,
                coupons: true,
                bingoBoard: true,
                movieTracking: true,
                onboarding: false,
                easterEggs: true,
                games: true,
                exercise: true
            },
            visibility: { showAdminNotes: false },
            inviteConfig: { inviteLink: null, generatedAt: null, expiresAt: null, isActive: true },
            createdAt: now,
            updatedAt: now
        }, { merge: true });

        // 2. teaser section
        batch.set(configColl.doc('teaser'), {
            isEnabled: true,
            unlockAt: 1775260800000,
            updatedAt: now
        });

        // 3. snapshotConfig section
        batch.set(configColl.doc('snapshotConfig'), {
            timerSeconds: 9,
            updatedAt: now
        });

        // 4. wrapped section
        batch.set(configColl.doc('wrapped'), {
            anniversaryDate: '04-04',
            anniversaryYear: 2022,
            nextWrappedDate: '2026-04-04',
            defaultStatsMode: 'eventDate',
            updatedAt: now
        });

        // 5. mapConfig section
        batch.set(configColl.doc('mapConfig'), {
            defaultCenter: { lat: 16.7521, lng: -93.1152 },
            defaultZoom: 12,
            style: 'romantic-vintage',
            pinTiers: [
                { minVisits: 1, color: "#FFB6C1", scale: 0.8 },
                { minVisits: 3, color: "#BF7DB1", scale: 1.0 },
                { minVisits: 5, color: "#F38686", scale: 1.2 },
                { minVisits: 10, color: "#F3E595", scale: 1.4 },
                { minVisits: 15, color: "#CCFFF7", scale: 1.6 }
            ],
            updatedAt: now
        });

        // 6. notifications section
        batch.set(configColl.doc('notifications'), {
            partnerFcmEnabled: true,
            adminActivityLogEnabled: true,
            updatedAt: now
        });

        // 7. onboarding section
        batch.set(configColl.doc('onboarding'), {
            enabled: false,
            modules: {
                map: true, bingo: true, capsules: true, coupons: true,
                snapshots: true, gallery: true, movies: true, games: true
            },
            updatedAt: now
        });

        // 8. modules section
        batch.set(configColl.doc('modules'), {
            bingo: { isEnabled: true },
            capsules: { isEnabled: true },
            coupons: { isEnabled: true },
            snapshots: { isEnabled: true },
            movies: { isEnabled: true },
            updatedAt: now
        });

        // 9. partner section
        batch.set(configColl.doc('partner'), {
            welcomeMessage: '¡Bienvenida a nuestro espacio! 💖',
            displayName: '',
            updatedAt: now
        });

        // 10. citaConfig section
        batch.set(configColl.doc('citaConfig'), {
            minPhotosSpontaneous: 5,
            minPhotosBingoDefault: 3,
            updatedAt: now
        });

        // 11. memoryTags section
        const defaultTags = [
            { value: 'viaje', label: 'Viaje ✈️' },
            { value: 'cita', label: 'Cita 🍷' },
            { value: 'aniversario', label: 'Aniversario 💝' },
            { value: 'random', label: 'Random 🤪' },
            { value: 'logro', label: 'Logro 🎯' },
            { value: 'hito', label: 'Hito 🌟' },
            { value: 'familia', label: 'Familia 👨‍👩‍👦' },
            { value: 'amigos', label: 'Amigos 👯‍♂️' },
            { value: 'cine', label: 'Cine 🍿' },
            { value: 'comida', label: 'Comida 🍝' },
            { value: 'aventura', label: 'Aventura 🌲' },
            { value: 'musica', label: 'Música 🎵' },
            { value: 'relax', label: 'Relax 💆‍♂️' },
            { value: 'deporte', label: 'Deporte 🏃‍♀️' },
            { value: 'arte', label: 'Arte 🎨' },
            { value: 'casa', label: 'En Casa 🏠' }
        ];
        
        // Save as object-wrapped array for easy partial updates if needed, 
        // though set merge: false will rewrite it anyway.
        batch.set(configColl.doc('memoryTags'), {
            ...defaultTags,
            updatedAt: now
        });

        await batch.commit();

        results.push({ relationshipId: relId, adminUid });
    }

    console.log(`✅ ${RELATIONSHIPS.length} relaciones administrativas configuradas.`);
    return results;
}
