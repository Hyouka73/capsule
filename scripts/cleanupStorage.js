/**
 * cleanupStorage.js — Delete all files in the Firebase Storage bucket.
 * 
 * Usage:
 *   node scripts/cleanupStorage.js
 */

const admin = require('../backend/node_modules/firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.resolve(__dirname, '..', 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('\n❌ No se encontró el serviceAccountKey.json');
    process.exit(1);
}

const keyFile = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
const projectId = keyFile.project_id;
const bucketName = `${projectId}.firebasestorage.app`; // Default bucket format

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(keyFile),
        storageBucket: bucketName
    });
}

const bucket = admin.storage().bucket();

async function cleanup() {
    console.log(`\n🔥 Limpiando bucket: ${bucketName}...`);

    const [files] = await bucket.getFiles();

    if (files.length === 0) {
        console.log('✅ El bucket ya está vacío.');
        process.exit(0);
    }

    console.log(`📦 Encontrados ${files.length} archivos. Eliminando...`);

    // Use bucket.deleteFiles() which is more efficient for mass deletion
    // or loop through if you want more control.
    await bucket.deleteFiles();

    console.log('\n✅ Bucket limpiado exitosamente.');
    process.exit(0);
}

cleanup().catch((err) => {
    console.error('\n❌ Error al limpiar el bucket:', err.message);
    process.exit(1);
});
