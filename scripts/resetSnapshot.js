/**
 * resetSnapshot.js — Resetea un documento de `instantaneas` a isSeen: false
 *
 * Uso:
 *   node scripts/resetSnapshot.js ./serviceAccountKey.json tu-project-id ID_DEL_DOC
 *
 * Argumentos:
 *   argv[2] — path al serviceAccountKey.json  (o GOOGLE_APPLICATION_CREDENTIALS)
 *   argv[3] — Firebase project ID             (o FIREBASE_PROJECT_ID)
 *   argv[4] — ID del documento en `instantaneas`  ← REQUERIDO
 */

// ─── Dependencias ─────────────────────────────────────────────────────────────
const admin = require('../backend/node_modules/firebase-admin');
const path = require('path');
const fs = require('fs');

// ─── Argumentos / Variables de entorno ────────────────────────────────────────
const serviceAccountArg = process.argv[2];
const projectIdArg = process.argv[3];
const docId = process.argv[4];

const serviceAccountPath = serviceAccountArg
    ? path.resolve(process.cwd(), serviceAccountArg)
    : process.env.GOOGLE_APPLICATION_CREDENTIALS
        ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
        : path.resolve(__dirname, '..', 'serviceAccountKey.json');

// Leer projectId: arg CLI > env var > desde el JSON mismo
let projectId = projectIdArg || process.env.FIREBASE_PROJECT_ID;

// ─── Validaciones ─────────────────────────────────────────────────────────────
if (!docId) {
    console.error('\n❌ Falta el ID del documento.');
    console.error('   Uso: node scripts/resetSnapshot.js ./serviceAccountKey.json tu-project-id ID_DEL_DOC\n');
    process.exit(1);
}

if (!fs.existsSync(serviceAccountPath)) {
    console.error('\n❌ No se encontró el serviceAccountKey.json');
    console.error('   Buscado en:', serviceAccountPath);
    console.error('\n   Pasos para obtenerlo:');
    console.error('   1. Ve a Firebase Console → Configuración del proyecto → Cuentas de servicio');
    console.error('   2. Haz clic en "Generar nueva clave privada"');
    console.error('   3. Guarda el archivo como serviceAccountKey.json en la raíz del repo');
    console.error('   4. Asegúrate que está en .gitignore\n');
    process.exit(1);
}

// Si no viene por arg/env, intentar leerlo del JSON
if (!projectId) {
    try {
        const keyFile = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        projectId = keyFile.project_id;
    } catch {
        // silencioso, validamos abajo
    }
}

if (!projectId) {
    console.error('\n❌ No se encontró el projectId.');
    console.error('   Pásalo como tercer argumento o como FIREBASE_PROJECT_ID=...\n');
    process.exit(1);
}

// ─── Inicializar Firebase Admin ────────────────────────────────────────────────
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath)),
        projectId,
    });
}

const db = admin.firestore();

// ─── Main ──────────────────────────────────────────────────────────────────────
async function reset() {
    console.log(`\n🔥 Conectando a Firestore (project: ${projectId})...`);
    console.log(`   Reseteando documento: instantaneas/${docId}`);

    const docRef = db.collection('instantaneas').doc(docId);
    await docRef.update({
        isSeen: false,
        seenAt: null,
    });

    console.log('\n✅ Documento reseteado exitosamente');
    console.log('   ID:', docId);
    console.log('   isSeen: false');
    console.log('   seenAt: null');
    console.log('\n💡 Ahora abre la app — el botón de tulipán debería prenderse de nuevo.\n');

    process.exit(0);
}

reset().catch((err) => {
    console.error('\n❌ Error al resetear el documento:', err.message);
    process.exit(1);
});
