import {
    collection,
    addDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS, ACTIVITY_ACTIONS } from '../config/constants';

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
 * @param {string} params.userId     - Partner's Firebase UID
 * @param {string} params.action     - One of ACTIVITY_ACTIONS
 * @param {string} params.targetType - 'memory' | 'photo' | 'capsule' | 'coupon' | 'bingo' | 'wrapped'
 * @param {string} params.targetId   - ID of the affected document
 * @param {object} [params.metadata] - Extra context depending on action
 * @param {string} params.displayText - Human-readable description shown in admin feed
 */
export async function logActivity({
    userId,
    action,
    targetType,
    targetId,
    metadata = {},
    displayText,
}) {
    try {
        await addDoc(collection(db, COLLECTIONS.ACTIVITY_LOG), {
            userId,
            action,
            targetType,
            targetId,
            metadata,
            displayText,
            isReadByAdmin: false,
            createdAt: serverTimestamp(),
        });
    } catch (err) {
        console.warn('[activityLogger] Failed to log activity:', err.message);
    }
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

export function logPhotoUploaded(userId, memoryId, photoCount, memoryTitle) {
    return logActivity({
        userId,
        action: ACTIVITY_ACTIONS.PHOTO_UPLOADED,
        targetType: 'memory',
        targetId: memoryId,
        metadata: { photoCount, memoryId },
        displayText: `Subió ${photoCount} foto${photoCount !== 1 ? 's' : ''} al recuerdo "${memoryTitle ?? 'sin título'}"`,
    });
}

export function logMemoryCreated(userId, memoryId, memoryTitle) {
    return logActivity({
        userId,
        action: ACTIVITY_ACTIONS.MEMORY_CREATED,
        targetType: 'memory',
        targetId: memoryId,
        metadata: { memoryId },
        displayText: `Creó el recuerdo "${memoryTitle ?? 'sin título'}"`,
    });
}

export function logPhotoMarkedSpecial(userId, photoId, memoryId) {
    return logActivity({
        userId,
        action: ACTIVITY_ACTIONS.PHOTO_MARKED_SPECIAL,
        targetType: 'photo',
        targetId: photoId,
        metadata: { memoryId },
        displayText: '♥ Marcó una foto como especial',
    });
}

export function logCapsuleOpened(userId, capsuleId, capsuleType) {
    return logActivity({
        userId,
        action: ACTIVITY_ACTIONS.CAPSULE_OPENED,
        targetType: 'capsule',
        targetId: capsuleId,
        metadata: { capsuleId, capsuleType },
        displayText: `Abrió una cápsula del tiempo (${capsuleType})`,
    });
}

export function logCouponUsed(userId, couponId, couponTitle, usedNotes) {
    return logActivity({
        userId,
        action: ACTIVITY_ACTIONS.COUPON_USED,
        targetType: 'coupon',
        targetId: couponId,
        metadata: { couponTitle, usedNotes: usedNotes ?? null },
        displayText: `Canjeó el cupón "${couponTitle}"`,
    });
}

export function logWrappedOpened(userId, year) {
    return logActivity({
        userId,
        action: ACTIVITY_ACTIONS.WRAPPED_OPENED,
        targetType: 'wrapped',
        targetId: String(year),
        metadata: { year },
        displayText: `✨ Abrió el Wrapped ${year}`,
    });
}
