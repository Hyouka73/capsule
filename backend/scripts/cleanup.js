import admin from "firebase-admin";

import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync(new URL('../../serviceAccountKey.json', import.meta.url)));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function cleanupData() {
    try {
        console.log("Iniciando limpieza...");

        // 1. Delete the partner user
        try {
            await auth.deleteUser('partner_main');
            console.log("✅ Usuario partner_main eliminado del Firebase Auth.");
        } catch (e) {
            console.log("ℹ️ No se pudo eliminar partner_main de Auth (quizá no existe aún):", e.message);
        }

        // 2. Clear tokens from Firestore
        const tokensSnap = await db.collection("inviteTokens").get();
        if (!tokensSnap.empty) {
            const batch = db.batch();
            tokensSnap.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`✅ ${tokensSnap.size} tokens de invitación eliminados de Firestore.`);
        } else {
            console.log("ℹ️ No hay tokens de invitación en la base de datos.");
        }

        console.log("🎉 Limpieza completada exitosamente.");
    } catch (error) {
        console.error("❌ Error durante la limpieza:", error);
    } finally {
        process.exit(0);
    }
}

cleanupData();
