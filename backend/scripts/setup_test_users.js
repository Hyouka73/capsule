import admin from 'firebase-admin';

// --- CONFIGURATION ---
const PROJECT_ID = 'capsule-valentins-day';
const USERS = [
    {
        uid: 'kT5JgmEpfMSCi1cMm7cLe1Oonb13', // Matches set-admin-claim.js
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin'
    },
    {
        uid: 'partner-test-uid-456',
        email: 'partner@example.com',
        password: 'partner123',
        role: 'partner'
    }
];

// Setup Emulator Environment
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

admin.initializeApp({
    projectId: PROJECT_ID
});

async function setupUsers() {
    console.log('👤 Setting up test users in Auth emulator...');
    
    for (const user of USERS) {
        try {
            // Check if user exists
            try {
                await admin.auth().getUser(user.uid);
                console.log(`   - User ${user.email} already exists.`);
            } catch (err) {
                if (err.code === 'auth/user-not-found') {
                    await admin.auth().createUser({
                        uid: user.uid,
                        email: user.email,
                        password: user.password,
                        emailVerified: true
                    });
                    console.log(`   ✅ Created user: ${user.email}`);
                } else {
                    throw err;
                }
            }

            // Set claims
            await admin.auth().setCustomUserClaims(user.uid, { role: user.role });
            console.log(`   🎯 Set role: ${user.role} for ${user.email}`);

        } catch (error) {
            console.error(`   ❌ Error setting up ${user.email}:`, error);
        }
    }

    console.log('\n🚀 Setup complete! Use these credentials in the login page.');
    process.exit(0);
}

setupUsers();
