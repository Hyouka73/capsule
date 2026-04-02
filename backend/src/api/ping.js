import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

export const handler = async (request) => {
    logger.info('Ping received from:', request.auth?.uid || 'anonymous');
    return {
        success: true,
        message: 'pong',
        timestamp: new Date().toISOString(),
        auth: !!request.auth
    };
};
