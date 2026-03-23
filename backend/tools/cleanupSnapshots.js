import admin from 'firebase-admin';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  await readFile(new URL('../../serviceAccountKey.json', import.meta.url))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'capsule-valentins-day.firebasestorage.app'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function cleanupSnapshots() {
  console.log('--- Iniciando limpieza de Instantáneas ---');

  // 1. Firestore
  const snapsRef = db.collection('instantaneas');
  const snapshot = await snapsRef.get();
  
  if (snapshot.empty) {
    console.log('No hay documentos en "instantaneas".');
  } else {
    console.log(`Borrando ${snapshot.size} documentos...`);
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log('Documentos borrados.');
  }

  // 2. Storage
  console.log('Buscando archivos en "snapshots/"...');
  try {
    const [files] = await bucket.getFiles({ prefix: 'snapshots/' });
    
    if (files.length === 0) {
      console.log('No hay archivos en la carpeta snapshots.');
    } else {
      console.log(`Borrando ${files.length} archivos...`);
      await Promise.all(files.map(file => file.delete()));
      console.log('Archivos borrados.');
    }
  } catch (err) {
    console.warn('Error al acceder a Storage (puede que la carpeta no exista):', err.message);
  }

  console.log('--- Limpieza completada ---');
  process.exit(0);
}

cleanupSnapshots().catch(err => {
  console.error('Error durante la limpieza:', err);
  process.exit(1);
});
