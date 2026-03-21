import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Ensure we connect to the emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

initializeApp({
    projectId: 'capsule-valentins-day'
});

const db = getFirestore();
const auth = getAuth();

async function seed() {
    console.log('--- Starting Seed ---');

    // 0. Auth User: admin@example.com / admin123
    console.log('Creating/Checking Auth user: admin@example.com / admin123...');
    try {
        await auth.createUser({
            uid: 'admin',
            email: 'admin@example.com',
            password: 'admin123',
            displayName: "Admin Dev"
        });
        console.log('Created new auth user.');
        // Set custom claims for admin
        await auth.setCustomUserClaims('admin', { role: 'admin' });
        console.log('Set admin custom claims.');
    } catch (e) {
        if (e.code === 'auth/uid-already-exists' || e.code === 'auth/email-already-exists') {
            console.log('Auth user exists, updating claims.');
            await auth.setCustomUserClaims('admin', { role: 'admin' });
        } else {
            console.error('Auth error:', e);
        }
    }

    // 1. /users/admin
    console.log('Seeding /users/admin...');
    await db.collection('users').doc('admin').set({
        role: "admin",
        deviceId: "dev-admin",
        displayName: "Admin Dev",
        email: "admin@example.com",
        updatedAt: new Date().toISOString()
    });

    // 2. /appConfig/main
    console.log('Seeding /appConfig/main...');
    await db.collection('appConfig').doc('main').set({
        features: { 
            memoryMap: true, 
            timeCapsules: true, 
            bingoBoard: true, 
            coupons: true, 
            photoGallery: true,
            onboarding: false,
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
        updatedAt: new Date().toISOString()
    });

    // 3. /inviteTokens/test-token-001
    console.log('Seeding /inviteTokens/test-token-001...');
    await db.collection('inviteTokens').doc('test-token-001').set({
        token: "test-token-001",
        used: false,
        createdAt: new Date().toISOString()
    });

    console.log('--- Seed Completed Successfully ---');
}

seed().catch(err => {
    console.error('Error seeding:', err);
    process.exit(1);
});
