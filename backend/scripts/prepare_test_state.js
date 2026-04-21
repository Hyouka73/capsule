
import admin from 'firebase-admin';
import { readFile } from 'fs/promises';
import path from 'path';

async function run() {
  const serviceAccountPath = path.resolve('serviceAccountKey.json');
  const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  const db = admin.firestore();
  const relId = 'capsule_production_rel_2';

  console.log(`--- Preparando estado de prueba Bingo para: ${relId} ---`);

  const boardRef = db.collection('relationships').doc(relId).collection('bingoBoards').doc('board');
  const boardSnap = await boardRef.get();

  if (!boardSnap.exists) {
    console.error('El tablero de Bingo no existe.');
    return;
  }

  const data = boardSnap.data();
  const currentCategories = data.categories || [];

  if (currentCategories.length === 0) {
    console.error('El tablero no tiene categorías.');
    return;
  }

  // 0,0 es la primera casilla (índice 0)
  const updatedCategories = currentCategories.map((cat, index) => {
    if (index === 0) {
      // Dejar vacía 0,0
      return {
        ...cat,
        isCompleted: false,
        completedMemoryId: null,
        completedAt: null
      };
    } else {
      // Completar las otras 15
      return {
        ...cat,
        isCompleted: true,
        completedMemoryId: 'test_memory_id_victory',
        completedAt: new Date().toISOString()
      };
    }
  });

  await boardRef.update({
    categories: updatedCategories,
    completedCount: 15,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log('✅ Estado de prueba preparado: 15/16 completadas, 0,0 libre.');
}

run().catch(console.error);
