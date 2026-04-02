import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * Log an activity in the relationship's activity log.
 * @param {Object} params - Activity parameters.
 * @param {string} params.relationshipId - ID of the relationship.
 * @param {string} params.userId - ID of the user performing the action.
 * @param {string} params.action - Action constant from ACTIVITY_ACTIONS.
 * @param {string|null} [params.targetType] - Type of the entity affected (optional).
 * @param {string|null} [params.targetId] - ID of the entity affected (optional).
 * @param {string} params.displayText - Human-readable text for the activity.
 * @param {Object} [params.metadata] - Additional metadata for the activity (optional).
 */
export const logActivity = async ({
    relationshipId,
    userId,
    action,
    targetType = null,
    targetId = null,
    displayText,
    metadata = {}
}) => {
    if (!relationshipId || !action || !displayText) {
        logger.error('Missing required fields for activity logging', { relationshipId, action, displayText });
        throw new Error('Missing required fields for activity logging');
    }

    const db = getFirestore();
    const activityRef = db.collection('relationships')
        .doc(relationshipId)
        .collection(COLLECTIONS.ACTIVITY_LOG)
        .doc();

    const logData = {
        relationshipId,
        userId,
        action,
        targetType,
        targetId,
        displayText,
        metadata: metadata || {},
        isReadByAdmin: false,
        readAt: null,
        createdAt: FieldValue.serverTimestamp()
    };

    try {
        await activityRef.set(logData);
        return { success: true, logId: activityRef.id };
    } catch (error) {
        logger.error('Error in activityService.logActivity:', error);
        throw error;
    }
};
