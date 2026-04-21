import { CloudTasksClient } from '@google-cloud/tasks';
import { logger } from 'firebase-functions';

/**
 * cloudTasksService — Wrapper para Google Cloud Tasks.
 *
 * Crea tareas HTTP one-shot programadas para una fecha/hora exacta.
 * En el emulador, las tareas se ejecutan inmediatamente al crearse.
 */

const PROJECT_ID  = process.env.GCLOUD_PROJECT || 'capsule-valentins-day';
const LOCATION    = 'us-central1';
const QUEUE_NAME  = 'special-events';

// URL base de las Cloud Functions desplegadas.
// En producción, Cloud Functions resuelve esto automáticamente.
const FUNCTIONS_BASE_URL =
    `https://${LOCATION}-${PROJECT_ID}.cloudfunctions.net`;

function getClient() {
    const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

    if (isEmulator) {
        return new CloudTasksClient({
            port: 9090,
            servicePath: 'localhost',
            sslCreds: require('@grpc/grpc-js').credentials.createInsecure(),
        });
    }

    return new CloudTasksClient(); // ADC en producción
}

/**
 * scheduleEventDispatch — Crea una Cloud Task one-shot que llama a
 * `dispatchEventNow` exactamente en `scheduledTime`.
 *
 * @param {object} params
 * @param {string} params.relationshipId
 * @param {string} params.eventId
 * @param {Date}   params.scheduledTime  — Fecha/hora exacta de ejecución
 * @returns {Promise<string>} taskName
 */
export async function scheduleEventDispatch({ relationshipId, eventId, scheduledTime }) {
    const client = getClient();
    const parent = client.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME);
    const scheduleSeconds = Math.floor(scheduledTime.getTime() / 1000);

    const task = {
        httpRequest: {
            httpMethod:  'POST',
            url:         `${FUNCTIONS_BASE_URL}/dispatchEventNow`,
            headers:     { 'Content-Type': 'application/json' },
            body:        Buffer.from(JSON.stringify({ relationshipId, eventId })).toString('base64'),
            oidcToken: {
                serviceAccountEmail: `${PROJECT_ID}@appspot.gserviceaccount.com`,
            },
        },
        scheduleTime: {
            seconds: scheduleSeconds,
        }
    };

    try {
        const [response] = await client.createTask({ parent, task });
        logger.info('[cloudTasksService] Task created:', response.name);
        return response.name;
    } catch (err) {
        logger.error('[cloudTasksService] FATAL ERROR creating task:', err);
        throw err;
    }
}

/**
 * deleteEventTask — Elimina la tarea programada de un evento
 * (útil al borrar o desactivar el evento desde el admin).
 *
 * @param {string} relationshipId
 * @param {string} eventId
 */
export async function deleteEventTask(relationshipId, eventId) {
    const client = getClient();
    const parent = client.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME);
    const taskName = `${parent}/tasks/special-event--${relationshipId}--${eventId}`;

    try {
        await client.deleteTask({ name: taskName });
        logger.info('[cloudTasksService] Task deleted:', taskName);
    } catch (err) {
        // Task may already have fired or not exist — ignore NOT_FOUND
        if (err.code !== 5) { // 5 = NOT_FOUND
            logger.warn('[cloudTasksService] deleteTask warning:', err.message);
        }
    }
}

/**
 * createSnapshotArchiveTask — Schedules an archive task for a snapshot after X hours.
 * @param {string} relationshipId 
 * @param {string} snapshotId 
 * @param {number} delayHours 
 */
export async function createSnapshotArchiveTask(relationshipId, snapshotId, delayHours = 24) {
    const client = getClient();
    const parent = client.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME);
    
    // Calcular tiempo de ejecución (ahora + X horas)
    const scheduledTime = new Date();
    scheduledTime.setHours(scheduledTime.getHours() + delayHours);
    const scheduleSeconds = Math.floor(scheduledTime.getTime() / 1000);

    const task = {
        httpRequest: {
            httpMethod: 'POST',
            url: `${FUNCTIONS_BASE_URL}/taskArchiveSnapshot`,
            headers: { 'Content-Type': 'application/json' },
            body: Buffer.from(JSON.stringify({ relationshipId, snapshotId })).toString('base64'),
            oidcToken: {
                serviceAccountEmail: `${PROJECT_ID}@appspot.gserviceaccount.com`,
            },
        },
        scheduleTime: {
            seconds: scheduleSeconds,
        }
    };

    try {
        const [response] = await client.createTask({ parent, task });
        logger.info(`[cloudTasksService] Archive task created for ${snapshotId}:`, response.name);
        return response.name;
    } catch (err) {
        logger.error(`[cloudTasksService] Error creating archive task for ${snapshotId}:`, err);
        throw err;
    }
}

// Grouped exports
export const cloudTasksService = {
    scheduleEventDispatch,
    deleteEventTask,
    createSnapshotArchiveTask
};
