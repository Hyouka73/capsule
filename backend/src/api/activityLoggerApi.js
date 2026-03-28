import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS, ACTIVITY_ACTIONS } from '../config/constants.js';

import { logger } from 'firebase-functions';

const db = getFirestore();

/**
 * Activity Logger — records partner actions to /activityLog
 * so the admin can see them in the dashboard feed.
 *
 * Only the partner triggers this — admin actions are already visible
 * because the admin creates/manages everything.
 */

/**
 * Log a partner activity action.
 * Fails silently — never block the user's action if logging fails.
 *
 * @param {object} params
 * @param {string} params.userId         - Partner's Firebase UID
 * @param {string} params.relationshipId - Current relationship ID
 * @param {string} params.action         - One of ACTIVITY_ACTIONS
 * @param {string} params.targetType     - 'memory' | 'photo' | 'capsule' | 'coupon' | 'bingo' | 'wrapped'
 * @param {string} params.targetId       - ID of the affected document
 * @param {object} [params.metadata]     - Extra context depending on action
 * @param {string} params.displayText    - Human-readable description shown in admin feed
 */
export async function logActivity({
    userId,
    relationshipId,
    action,
    targetType,
    targetId,
    metadata = {},
    displayText,
}) {
    if (!relationshipId) {
        logger.error('[activityLogger] CRITICAL: Missing relationshipId for log:', action);
        return; // Don't throw to avoid blocking the caller
    }

    try {
        await db
            .collection('relationships')
            .doc(relationshipId)
            .collection(COLLECTIONS.ACTIVITY_LOG)
            .add({
                userId,
                relationshipId,
                action,
                targetType,
                targetId,
                metadata,
                displayText,
                isReadByAdmin: false,
                createdAt: FieldValue.serverTimestamp(),
            });
    } catch (err) {
        logger.warn('[activityLogger] Failed to log activity:', err.message);
    }
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

export function logPhotoUploaded(userId, relationshipId, memoryId, photoCount, memoryTitle) {
    return logActivity({
        userId,
        relationshipId,
        action: ACTIVITY_ACTIONS.PHOTO_UPLOADED,
        targetType: 'memory',
        targetId: memoryId,
        metadata: { photoCount, memoryId },
        displayText: `Subió ${photoCount} foto${photoCount !== 1 ? 's' : ''} al recuerdo "${memoryTitle ?? 'sin título'}"`,
    });
}

export function logMemoryCreated(userId, relationshipId, memoryId, memoryTitle) {
    return logActivity({
        userId,
        relationshipId,
        action: ACTIVITY_ACTIONS.MEMORY_CREATED,
        targetType: 'memory',
        targetId: memoryId,
        metadata: { memoryId },
        displayText: `Creó el recuerdo "${memoryTitle ?? 'sin título'}"`,
    });
}

export function logPhotoMarkedSpecial(userId, relationshipId, photoId, memoryId) {
    return logActivity({
        userId,
        relationshipId,
        action: ACTIVITY_ACTIONS.PHOTO_MARKED_SPECIAL,
        targetType: 'photo',
        targetId: photoId,
        metadata: { memoryId },
        displayText: '♥ Marcó una foto como especial',
    });
}

export function logCapsuleOpened(userId, relationshipId, capsuleId, capsuleType) {
    return logActivity({
        userId,
        relationshipId,
        action: ACTIVITY_ACTIONS.CAPSULE_OPENED,
        targetType: 'capsule',
        targetId: capsuleId,
        metadata: { capsuleId, capsuleType },
        displayText: `Abrió una cápsula del tiempo (${capsuleType})`,
    });
}

export function logCouponUsed(userId, relationshipId, couponId, couponTitle, usedNotes) {
    return logActivity({
        userId,
        relationshipId,
        action: ACTIVITY_ACTIONS.COUPON_USED,
        targetType: 'coupon',
        targetId: couponId,
        metadata: { couponTitle, usedNotes: usedNotes ?? null },
        displayText: `Canjeó el cupón "${couponTitle}"`,
    });
}

export function logWrappedOpened(userId, relationshipId, year) {
    return logActivity({
        userId,
        relationshipId,
        action: ACTIVITY_ACTIONS.WRAPPED_OPENED,
        targetType: 'wrapped',
        targetId: String(year),
        metadata: { year },
        displayText: `✨ Abrió el Wrapped ${year}`,
    });
}

