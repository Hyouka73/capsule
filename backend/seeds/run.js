import admin from 'firebase-admin';

// Para ejecutar seeds: iniciar emuladores primero con "firebase emulators:start"

// Initialize Firebase Admin
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.GCLOUD_PROJECT = 'capsule-valentins-day';

admin.initializeApp({ projectId: 'capsule-valentins-day' });
const db = admin.firestore();

// Import seeders dynamically to keep it scalable 
import seedAuth from './01_auth.js';
import seedMemories from './02_memories.js';
import seedBingo from './03_bingo.js';
import seedCapsules from './04_capsules.js';
import seedPinTiers from './05_pinTiers.js';
import seedBingoTest from './06_bingo_test.js';

async function runSeeds() {
    console.log('🚀 Iniciando proceso de Seed Global para la APP...');

    try {
        await seedAuth(admin, db);
        await seedMemories(admin, db);
        await seedBingo(admin, db);
        await seedCapsules(admin, db);
        await seedPinTiers(admin, db);
        await seedBingoTest(admin, db); // Added test scenario
        
        console.log('🎉 Seed global ejecutado exitosamente. Todo listo para QA.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error general durante el seed:', err);
        process.exit(1);
    }
}

runSeeds();
