import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { COLLECTIONS } from '../config/constants.js';

/**
 * onPhotoUploaded Trigger
 * Processes uploaded photos to generate thumbnails and update memory/snapshot metadata.
 * Implements idempotency to avoid double-counting photoCount.
 */
export const onPhotoUploaded = onObjectFinalized({ 
    region: 'us-central1',
    bucket: 'capsule-sooty.firebasestorage.app' 
}, async (event) => {
    const filePath = event.data.name; // memories/{memoryId}/{photoId}.jpg or snapshots/{snapshotId}.jpg
    const contentType = event.data.contentType;
    const bucketName = event.data.bucket;

    // 1. Initial filters
    const fileName = path.basename(filePath);
    if (!filePath || fileName.startsWith('thumb_')) return;
    if (!contentType?.startsWith('image/') && contentType !== 'application/octet-stream') return;

    const parts = filePath.split('/');
    if (parts.length < 2) return;

    const rootFolder = parts[0]; // 'memories' or 'snapshots'
    
    let photoId;
    let memoryId = null;
    let snapshotId = null;

    if (rootFolder === 'memories') {
        if (parts.length < 3) return;
        memoryId = parts[1];
        photoId = path.parse(parts[2]).name;
    } else if (rootFolder === 'snapshots') {
        snapshotId = path.parse(parts[1]).name;
        photoId = snapshotId;
    } else {
        return;
    }

    const isSnapshot = !!snapshotId;
    const isMemory = !!memoryId;

    const db = getFirestore();
    const storageBucket = getStorage().bucket(bucketName);
    const thumbStoragePath = isMemory
        ? `memories/${memoryId}/thumb_${photoId}.jpg`
        : `snapshots/thumb_${snapshotId}.jpg`;

    const tmpDir = os.tmpdir();
    const originalTmpPath = path.join(tmpDir, `${photoId}_original`);
    const thumbTmpPath = path.join(tmpDir, `${photoId}_thumb.jpg`);

    try {
        // 2. Check if thumbnail already exists (Idempotency Step A - Storage)
        const thumbFile = storageBucket.file(thumbStoragePath);
        const [thumbExists] = await thumbFile.exists();
        let thumbUrl;

        if (!thumbExists) {
            console.log(`[onPhotoUploaded] Generating thumbnail for ${photoId}...`);
            await storageBucket.file(filePath).download({ destination: originalTmpPath });

            await sharp(originalTmpPath)
                .rotate()
                .resize({ width: 400, withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toFile(thumbTmpPath);

            await storageBucket.upload(thumbTmpPath, {
                destination: thumbStoragePath,
                metadata: {
                    contentType: 'image/jpeg',
                    metadata: { generatedBy: 'onPhotoUploaded' },
                },
            });

            await thumbFile.makePublic();
            thumbUrl = `https://storage.googleapis.com/${bucketName}/${thumbStoragePath}`;
        } else {
            console.log(`[onPhotoUploaded] Thumbnail already exists for ${photoId}, using existing URL.`);
            thumbUrl = `https://storage.googleapis.com/${bucketName}/${thumbStoragePath}`;
        }

        // 3. Transactional Update (Idempotency Step B - Firestore)
        await db.runTransaction(async (transaction) => {
            const photoRef = isMemory
                ? db.collection(COLLECTIONS.MEMORIES).doc(memoryId).collection(COLLECTIONS.PHOTOS).doc(photoId)
                : db.collection(COLLECTIONS.INSTANTANEAS).doc(snapshotId);

            const photoSnap = await transaction.get(photoRef);
            if (!photoSnap.exists && isSnapshot) {
                console.warn(`[onPhotoUploaded] Snapshot ${snapshotId} doesn't exist yet, deferring.`);
                throw new Error('Snapshot not found');
            }

            const photoData = photoSnap.data() || {};
            if (photoData.isProcessed) {
                console.log(`[onPhotoUploaded] Photo ${photoId} already marked as processed. Skipping transaction.`);
                return;
            }

            if (isMemory) {
                const memoryRef = db.collection(COLLECTIONS.MEMORIES).doc(memoryId);
                const memorySnap = await transaction.get(memoryRef);

                if (!memorySnap.exists) {
                    console.warn(`[onPhotoUploaded] Memory ${memoryId} not found, skipping.`);
                    return;
                }

                const memoryData = memorySnap.data();
                const isFirstPhoto = (memoryData.photoCount || 0) === 0;

                // Make original public for URL
                const originalFile = storageBucket.file(filePath);
                await originalFile.makePublic();
                const originalUrl = `https://storage.googleapis.com/${bucketName}/${filePath}`;

                // Update Photo Doc
                transaction.set(photoRef, {
                    thumbnailPath: thumbStoragePath,
                    thumbnailUrl: thumbUrl,
                    uploadStatus: 'completed',
                    isSnapshot: false,
                    isProcessed: true,
                    updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true });

                // Update Memory Doc
                transaction.update(memoryRef, {
                    photoCount: FieldValue.increment(1),
                    ...(isFirstPhoto ? {
                        mainPhotoUrl: originalUrl,
                        mainPhotoStoragePath: filePath,
                    } : {}),
                    updatedAt: FieldValue.serverTimestamp(),
                });

                // Update Place Doc
                if (memoryData.placeId) {
                    const placeRef = db.collection(COLLECTIONS.PLACES).doc(memoryData.placeId);
                    transaction.update(placeRef, {
                        photoCount: FieldValue.increment(1),
                        ...(isFirstPhoto ? { coverPhotoUrl: thumbUrl } : {}),
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                }
            } else if (isSnapshot) {
                transaction.update(photoRef, {
                    thumbnailUrl: thumbUrl,
                    thumbnailStoragePath: thumbStoragePath,
                    isProcessed: true,
                    updatedAt: FieldValue.serverTimestamp(),
                });
            }
        });

        console.log(`[onPhotoUploaded] Successfully processed photo ${photoId}`);

    } catch (error) {
        console.error('[onPhotoUploaded] Error processing photo:', error);
        // We re-throw for snapshots to trigger function retry if it was a race condition
        if (isSnapshot && error.message === 'Snapshot not found') {
            throw error;
        }
    } finally {
        if (fs.existsSync(originalTmpPath)) fs.unlinkSync(originalTmpPath);
        if (fs.existsSync(thumbTmpPath)) fs.unlinkSync(thumbTmpPath);
    }
});
