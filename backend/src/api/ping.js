import { onCall } from 'firebase-functions/v2/https';

export const ping = onCall({ region: 'us-central1', cors: true }, async (request) => {
    return {
        success: true,
        message: 'Pong! Cloud Functions emulator is reachable.',
        timestamp: new Date().toISOString(),
        project: process.env.GCLOUD_PROJECT,
        emulator: process.env.FUNCTIONS_EMULATOR
    };
});

