import admin from 'firebase-admin';

// Initialize Firebase Admin for Emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.GCLOUD_PROJECT = 'capsule-valentins-day';

admin.initializeApp({ projectId: 'capsule-valentins-day' });
const db = admin.firestore();

// Import seeders
import seedAuth from './01_auth.js';
import seedMemories from './02_memories.js';
import seedBingo from './03_bingo.js';
import seedCapsules from './04_capsules.js';
import seedPinTiers from './05_pinTiers.js';
import seedCoupons from './06_coupons.js';
import seedSnapshots from './07_snapshots.js';

async function runSeeds() {
    console.log('🚀 Iniciando proceso de Seed para Ambiente de Aislamiento...');

    try {
        // 1. Auth & Admin setup (returns 2 relationships)
        const activeRels = await seedAuth(admin, db);

        // 2. Loop through each relationship and seed data asymmetrically
        for (const relInfo of activeRels) {
            const { relationshipId, adminUid } = relInfo;
            
            // Rel 1 gets Heavy data, Rel 2 stays Clean
            const isFullSeed = (relationshipId === 'capsule_development_rel_1');
            
            console.log(`\n📦 Procesando Relación: ${relationshipId} (Full: ${isFullSeed})`);

            await seedMemories(admin, db, relationshipId, adminUid, isFullSeed);
            await seedBingo(admin, db, relationshipId, adminUid, isFullSeed);
            await seedCapsules(admin, db, relationshipId, adminUid, isFullSeed);
            await seedPinTiers(admin, db, relationshipId, adminUid, isFullSeed);
            await seedCoupons(admin, db, relationshipId, adminUid, isFullSeed);
            await seedSnapshots(admin, db, relationshipId, adminUid, isFullSeed);
        }
        
        console.log('\n🎉 Proceso de Seed finalizado con éxito.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error general durante el proceso de seed:', err);
        process.exit(1);
    }
}

runSeeds();
