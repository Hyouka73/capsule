export default async function seedAuth(admin, db) {
    console.log('--- Seeding Auth & Config ---');
    
    // 1. AppConfig
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Ayer
    
    await db.collection('appConfig').doc('main').set({
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
            movieTracking: false,
            easterEggs: false,
            games: false,
            exercise: false
        },
        inviteConfig: { 
            inviteLink: null, 
            generatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        snapshotConfig: { 
            timerSeconds: 9 
        },
        citaConfig: {
            minPhotosSpontaneous: 5,
            minPhotosBingoDefault: 3,
        },
        partner: {
            displayName: "Test Partner",
            welcomeMessage: "¡Bienvenida a nuestra cápsula!"
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`✅ AppConfig configurado. Teaser desbloqueado (fecha en el pasado).`);

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
    await admin.auth().setCustomUserClaims(adminUid, { role: 'admin' });
    
    // 3. Documentos de usuario en Firestore
    await db.collection('users').doc(adminUid).set({
        role: 'admin',
        email: adminEmail,
        displayName: 'Admin Test',
        teaserCompleted: true,
        welcomeSeen: true,
        gameCoins: 0,
        coinTransactions: []
    }, { merge: true });

    console.log(`✅ Admin (${adminEmail}) creado/verificado.`);
}

