export default async function seedAuth(admin, db) {
    console.log('--- Seeding Auth & Config ---');
    
    // 0. Fixed Relationship ID for development
    const REL_ID = 'capsule_development_rel_123';

    // 1. AppConfig (Mover a Subcolección de relación)
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Ayer
    
    const configRef = db.doc(`relationships/${REL_ID}/config/main`);
    await configRef.set({
        teaser: {
            unlockAt: pastDate.toISOString(),
            isEnabled: true
        },
        features: {
            memoryMap: true, 
            timeCapsules: true, 
            bingoBoard: true, 
            coupons: true, 
            photoGallery: true,
            onboarding: true,
            movieTracking: true, // Habilitar por defecto en dev
            easterEggs: true,
            games: true,
            exercise: true
        },
        inviteConfig: { 
            inviteLink: null, 
            generatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        snapshotConfig: { 
            timerSeconds: 9 
        },
        citaConfig: {
            minPhotosSpontaneous: 2, // Más fácil para probar en dev
            minPhotosBingoDefault: 1,
        },
        partner: {
            displayName: "Test Partner",
            welcomeMessage: "¡Bienvenida a nuestra cápsula!"
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`✅ AppConfig configurado en subcolección para ${REL_ID}.`);

    // 2. Usuarios: Solo Admin
    const adminEmail = 'admin@test.com';
    let adminUid;

    // 2.1 Admin Creation (Password)
    try {
        const aRecord = await admin.auth().getUserByEmail(adminEmail);
        adminUid = aRecord.uid;
    } catch {
        const aRecord = await admin.auth().createUser({ email: adminEmail, password: 'password', displayName: 'Admin' });
        adminUid = aRecord.uid;
    }
    
    // 2.2 Asignar Custom Claims (Crucial para acceso a subcolecciones)
    await admin.auth().setCustomUserClaims(adminUid, { 
        role: 'admin',
        relationshipId: REL_ID
    });
    
    // 3. Documentos de usuario en Firestore
    await db.collection('users').doc(adminUid).set({
        role: 'admin',
        email: adminEmail,
        displayName: 'Admin Test',
        relationshipId: REL_ID, // AISLACIÓN
        teaserCompleted: true,
        welcomeSeen: true,
        gameCoins: 100, // Dar algunas monedas para probar
        coinTransactions: []
    }, { merge: true });

    console.log(`✅ Admin (${adminEmail}) creado/verificado con Relationship ID: ${REL_ID}.`);
}

