export default async function seedAuth(admin, db) {
    console.log('--- Seeding Auth & Config ---');
    
    // 1. AppConfig
    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 2); // 2 minutos en el futuro para testing del Teaser
    
    await db.collection('appConfig').doc('main').set({
        teaser: {
            unlockAt: futureDate.toISOString(),
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
            generatedAt: null 
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
        updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('✅ AppConfig configurado con unlockAt en +2 mins.');

    // 2. Usuarios: Admin y Partner
    const adminEmail = 'admin@test.com';
    const partnerEmail = 'partner@test.com';
    let adminUid, partnerUid;

    try {
        const aRecord = await admin.auth().getUserByEmail(adminEmail);
        adminUid = aRecord.uid;
    } catch {
        const aRecord = await admin.auth().createUser({ email: adminEmail, password: 'password', displayName: 'Admin' });
        adminUid = aRecord.uid;
    }
    await admin.auth().setCustomUserClaims(adminUid, { role: 'admin' });
    
    try {
        const pRecord = await admin.auth().getUserByEmail(partnerEmail);
        partnerUid = pRecord.uid;
    } catch {
        const pRecord = await admin.auth().createUser({ email: partnerEmail, password: 'password', displayName: 'Partner' });
        partnerUid = pRecord.uid;
    }
    await admin.auth().setCustomUserClaims(partnerUid, { role: 'partner' });

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

    await db.collection('users').doc(partnerUid).set({
        role: 'partner',
        email: partnerEmail,
        displayName: 'Partner Test',
        teaserCompleted: false, // Para probar redirecciones (Bloque A)
        welcomeSeen: false,      // Para probar redirecciones (Bloque B)
        gameCoins: 0,
        coinTransactions: []
    }, { merge: true });
    
    console.log(`✅ Usuarios (y claims) creados: Admin(${adminEmail}) y Partner(${partnerEmail}).`);
}
