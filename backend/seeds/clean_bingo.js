/**
 * UTILITY: clean_bingo.js
 * Resetea el tablero de bingo y las monedas del partner para repetir pruebas.
 */

import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    process.env.GCLOUD_PROJECT = 'capsule-valentins-day';
    admin.initializeApp({ projectId: 'capsule-valentins-day' });
}

const db = admin.firestore();

async function cleanBingo() {
    console.log('--- Cleaning Bingo State ---');
    
    const partnerUid = 'partner-test-uid';
    const boardPath = 'bingoBoard/board';

    try {
        // 1. Reset Board
        const boardSnap = await db.doc(boardPath).get();
        if (boardSnap.exists()) {
            const data = boardSnap.data();
            const resetCats = (data.categories || []).map(c => ({
                ...c,
                completedMemoryId: null,
                completedAt: null
            }));
            
            await db.doc(boardPath).update({
                categories: resetCats,
                completedCount: 0,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ Tablero reseteado.');
        }

        // 2. Reset Partner Coins
        await db.collection('users').doc(partnerUid).update({
            gameCoins: 0,
            coinTransactions: []
        });
        console.log(`✅ Monedas del partner (${partnerUid}) reseteadas a 0.`);

    } catch (err) {
        console.error('❌ Error al limpiar:', err);
    }
}

cleanBingo();
