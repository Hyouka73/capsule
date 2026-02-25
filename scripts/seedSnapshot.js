/**
 * seedSnapshot.js — Crea un documento de prueba en la colección `instantaneas`
 *
 * Requiere:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json  (variable de entorno)
 * O bien pasar el path explícito:
 *   node scripts/seedSnapshot.js ./serviceAccountKey.json
 *
 * Y el projectId del proyecto Firebase:
 *   FIREBASE_PROJECT_ID=tu-project-id  (variable de entorno)
 * O pasarlo como segundo argumento:
 *   node scripts/seedSnapshot.js ./serviceAccountKey.json tu-project-id
 *
 * firebase-admin ya está instalado en backend/. Corre desde la raíz del repo.
 */

// ─── Dependencias ─────────────────────────────────────────────────────────────
// Usamos el firebase-admin que ya existe en backend/node_modules
const admin = require('../backend/node_modules/firebase-admin');
const path = require('path');
const fs = require('fs');

// ─── Argumentos / Variables de entorno ────────────────────────────────────────
const serviceAccountArg = process.argv[2]; // primer arg: path al serviceAccountKey.json
const projectIdArg = process.argv[3];      // segundo arg: project ID

const serviceAccountPath = serviceAccountArg
    ? path.resolve(process.cwd(), serviceAccountArg)
    : process.env.GOOGLE_APPLICATION_CREDENTIALS
        ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
        : path.resolve(__dirname, '..', 'serviceAccountKey.json');

// Leer projectId: arg CLI > env var > desde el JSON mismo
let projectId = projectIdArg || process.env.FIREBASE_PROJECT_ID;

// ─── Validaciones ─────────────────────────────────────────────────────────────
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
    console.error('   Pásalo como segundo argumento o como FIREBASE_PROJECT_ID=...\n');
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
const { FieldValue } = admin.firestore;

// ─── Documento a insertar ──────────────────────────────────────────────────────
const snapshotData = {
    photoUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800',
    storagePath: 'instantaneas/test001/photo.jpg',
    message: 'Estaba pensando en ti ✨',
    isSeen: false,
    seenAt: null,
    createdAt: FieldValue.serverTimestamp(),
};

// ─── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
    console.log(`\n🔥 Conectando a Firestore (project: ${projectId})...`);

    const docRef = await db.collection('instantaneas').add(snapshotData);

    console.log('\n✅ Documento creado exitosamente');
    console.log('   ID:', docRef.id);
    console.log('   Colección: instantaneas');
    console.log('   Datos:');
    console.log('  ', JSON.stringify({ ...snapshotData, createdAt: '<serverTimestamp>' }, null, 4).replace(/\n/g, '\n   '));
    console.log('\n💡 Ahora abre la app — el botón de tulipán debería prenderse.\n');

    process.exit(0);
}

seed().catch((err) => {
    console.error('\n❌ Error al crear el documento:', err.message);
    process.exit(1);
});
