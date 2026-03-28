import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/**
 * markLogAsRead — Calls the Cloud Function to mark a specific log or all logs as read.
 * @param {string|null} logId - ID of the log to mark as read, or null if markAll is true.
 * @param {boolean} [markAll=false] - Whether to mark all logs for the relationship as read.
 * @returns {Promise<{ success: boolean, count?: number }>}
 */
export async function markLogAsRead(logId, markAll = false) {
    const fn = httpsCallable(functions, 'markLogAsRead');
    const result = await fn({ logId, markAll });
    return result.data;
}
