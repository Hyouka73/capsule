const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getFunctions } = require('firebase-admin/functions');
const { COLLECTIONS } = require('../config/constants');

/**
 * createCapsule — Serverless BFF API
 * 
 * Crea una nueva cápsula del tiempo. Si la fecha de apertura es en el futuro,
 * encola automáticamente una tarea (Cloud Task) para el desbloqueo y notificación exacta.
 */
exports.createCapsule = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes iniciar sesión para crear una cápsula.');
    }

    const { uid } = request.auth;
    const { title, teaserMessage, message, unlockTrigger, unlockDate, autoDestruct, notifyOnUnlock } = request.data;

    if (!title || !unlockTrigger) {
        throw new HttpsError('invalid-argument', 'El título y el motivo de desbloqueo son obligatorios.');
    }

    const db = getFirestore();

    // Convertir fecha de apertura de string a Timestamp
    let parsedUnlockDate = null;
    if (unlockTrigger === 'date' && unlockDate) {
        parsedUnlockDate = Timestamp.fromDate(new Date(unlockDate));
    }

    // Si es desbloqueo manual (por acertijo o GPS futuramente), se queda sin task
    const isUnlocked = unlockTrigger === 'manual' ? false : (parsedUnlockDate ? parsedUnlockDate.toMillis() <= Date.now() : true);

    const capsuleData = {
        title,
        teaserMessage: teaserMessage || 'Tienes un mensaje bloqueado.',
        message: message || null,
        createdBy: uid,
        createdAt: FieldValue.serverTimestamp(),

        unlockTrigger, // 'date' | 'manual'
        unlockDate: parsedUnlockDate,
        isUnlocked: isUnlocked,
        unlockedAt: isUnlocked ? FieldValue.serverTimestamp() : null,

        autoDestruct: autoDestruct || false, // Read-Once deletion
        isDestructed: false,
        isViewed: false,
        notifyOnUnlock: notifyOnUnlock !== undefined ? notifyOnUnlock : true,

        hasAttachments: false,
        files: [],
    };

    try {
        const capsuleRef = await db.collection(COLLECTIONS.CAPSULES).add(capsuleData);

        // Si la cápsula aún está bloqueada y depende de la fecha, delegamos el despertador a Cloud Tasks
        if (!isUnlocked && unlockTrigger === 'date' && parsedUnlockDate) {
            const queue = getFunctions().taskQueue('taskUnlockCapsule');

            await queue.enqueue(
                { capsuleId: capsuleRef.id },
                { scheduleTime: parsedUnlockDate.toDate() } // Corrección: a la fecha exacta configurada
            );
            console.log(`Cloud Task programada para cápsula ${capsuleRef.id} en ${parsedUnlockDate.toDate()}`);
        }

        return {
            success: true,
            capsuleId: capsuleRef.id,
            message: 'Cápsula creada exitosamente.'
        };
    } catch (error) {
        console.error('Error in createCapsule:', error);
        throw new HttpsError('internal', 'Ocurrió un error al persistir la cápsula en base de datos.');
    }
});
