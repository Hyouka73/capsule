/**
 * SEED: 06_bingo_test.js
 * Escenario: COMBO ÉPICO (4x5)
 * 
 * Configura el tablero con 19 de 20 casillas completadas.
 * La casilla (0,0) queda vacía y es "Especial".
 * Al completarla, se activa: Horizontal + Vertical + Diagonal + Full Board + Casilla Especial.
 * Total: +100 monedas.
 */

export default async function seedBingoTest(admin, db) {
    console.log('--- Seeding Bingo Test (Combo Épico) ---');

    const ROWS = 4;
    const COLS = 4;
    const TOTAL_TILES = ROWS * COLS;
    const partnerUid = 'partner-test-uid'; // UID para pruebas manuales

    // 1. Crear el usuario Partner si no existe o actualizarlo
    await db.collection('users').doc(partnerUid).set({
        role: 'partner',
        displayName: 'Test Partner',
        email: 'partner@test.com',
        gameCoins: 0,
        coinTransactions: [],
        onboardingCompleted: true,
        welcomeSeen: true,
        teaserCompleted: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`✅ Partner (${partnerUid}) configurado con 0 monedas.`);

    // 2. Construir las categorías para el tablero 4x4
    const categories = [];
    const now = new Date().toISOString();

    for (let i = 0; i < TOTAL_TILES; i++) {
        const isTarget = (i === 0); // La casilla (0,0) es el índice 0
        
        categories.push({
            id: `bingo_tile_${i}`,
            title: isTarget ? 'EL GRAN RETO 🚀' : `Reto ${i}`,
            emoji: isTarget ? '👑' : '⭐',
            minPhotos: 1,
            completedMemoryId: isTarget ? null : `mock_memory_${i}`,
            completedAt: isTarget ? null : now,
            isSpecial: isTarget, // (0,0) es especial
            isEnabled: true,
            suggestedTags: [{ value: 'test', label: 'Test' }]
        });
    }

    // 3. Guardar en bingoBoard/board (Ruta detectada en BingoContext.jsx)
    await db.collection('bingoBoard').doc('board').set({
        categories: categories,
        completedCount: TOTAL_TILES - 1,
        totalCount: TOTAL_TILES,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Tablero 4x4 configurado para Combo Épico (15/16 completadas).');
    console.log('👉 INSTRUCCIONES:');
    console.log('   1. Loguearse como partner@test.com');
    console.log('   2. Ir a la pestaña de Bingo');
    console.log('   3. Completar la primera casilla (arriba a la izquierda)');
    console.log('   4. ¡Disfrutar del Combo de 100 monedas! 🎊');
}
