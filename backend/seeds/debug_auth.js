import admin from 'firebase-admin';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.GCLOUD_PROJECT = 'capsule-valentins-day';

admin.initializeApp({ projectId: 'capsule-valentins-day' });

async function verify() {
    const email = 'admin@test.com';
    try {
        const user = await admin.auth().getUserByEmail(email);
        console.log('User found:', user.uid);
        console.log('Custom Claims:', JSON.stringify(user.customClaims));
    } catch (e) {
        console.error('User not found:', email);
    }
    process.exit(0);
}

verify();
