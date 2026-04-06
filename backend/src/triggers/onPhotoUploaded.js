import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * onPhotoUploaded Trigger
 * Processes uploaded photos to generate thumbnails and update memory/snapshot metadata.
 * Implements idempotency to avoid double-counting photoCount.
 */
export const onPhotoUploaded = onObjectFinalized({ 
    memory: '1GiB',
    timeoutSeconds: 300 
}, async (event) => {
    const filePath = event.data.name; 
    const contentType = event.data.contentType;
    const bucketName = event.data.bucket;
    const metadata = event.data.metadata || {};

    if (metadata.isProcessed === 'true') {
        logger.info(`[onPhotoUploaded] Skipping already-processed file: ${filePath}`);
        return;
    }

    // 1. Initial filters
    const fileName = path.basename(filePath);
    if (!filePath || fileName.startsWith('thumb_') || fileName.startsWith('detail_')) return;

    // Backend validation (Defense in depth)
    const isImage = contentType?.startsWith('image/');
    if (!isImage) {
        logger.error(`[onPhotoUploaded] REJECTED: Non-image file. Path: ${filePath}, Type: ${contentType}`);
        return;
    }

    const parts = filePath.split('/');
    if (parts.length < 2) return;

    const rootFolder = parts[0]; 
    const isMain = metadata.isMain === 'true';
    const isSnapshot = metadata.isSnapshot === 'true' || rootFolder === 'snapshots' || parts[1] === 'snapshots';
    const isMemory = !isSnapshot && rootFolder === 'memories';
    const isCapsule = !isSnapshot && rootFolder === 'capsules';

    let photoId;
    let memoryId = null;
    let snapshotId = null;
    let capsuleId = null;

    if (isSnapshot) {
        // Handle both: snapshots/id.jpg AND relId/snapshots/id.orig
        // parts[0] = relationshipId, parts[1] = 'snapshots', parts[2] = snapshotId.ext
        const filename = parts[parts.length - 1];
        if (!filename) return;
        snapshotId = path.parse(filename).name; // This correctly gets ID from id.orig or id.jpg
        photoId = snapshotId;
    } else if (isMemory) {
        if (parts.length < 3) return;
        memoryId = parts[1];
        photoId = path.parse(parts[2]).name;
    } else if (isCapsule) {
        if (parts.length < 3) return;
        capsuleId = parts[1];
        photoId = path.parse(parts[2]).name;
    } else {
        return;
    }

    const db = getFirestore();
    const storageBucket = getStorage().bucket(bucketName);
    
    // Relationship determination
    const finalRelId = (rootFolder !== 'snapshots' && rootFolder !== 'memories' && rootFolder !== 'capsules') 
        ? rootFolder 
        : (metadata.relationshipId || 'legacy');

    // Final clean paths (always .webp)
    let fullStoragePath;
    let detailStoragePath = null;
    if (isSnapshot) {
        fullStoragePath = `${finalRelId}/snapshots/${photoId}.webp`;
    } else if (isMemory) {
        fullStoragePath = `memories/${memoryId}/${photoId}.webp`;
        detailStoragePath = `memories/${memoryId}/detail_${photoId}.webp`;
    } else if (isCapsule) {
        fullStoragePath = `capsules/${capsuleId}/${photoId}.webp`;
    } else {
        return;
    }

    const thumbStoragePath = isMemory
        ? `memories/${memoryId}/thumb_${photoId}.webp`
        : (isSnapshot ? `${finalRelId}/snapshots/thumb_${snapshotId}.webp` : null);

    const tmpDir = os.tmpdir();
    const originalTmpPath = path.join(tmpDir, `${photoId}_orig`);
    const fullTmpPath = path.join(tmpDir, `${photoId}_full.webp`);
    const thumbTmpPath = path.join(tmpDir, `${photoId}_thumb.webp`);
    const detailTmpPath = path.join(tmpDir, `${photoId}_detail.webp`);

    try {
        // Download original
        await storageBucket.file(filePath).download({ destination: originalTmpPath });

        // 2. Process Versions - LAZY LOAD SHARP
        const { default: sharp } = await import('sharp');
        const pipeline = sharp(originalTmpPath).rotate();


        // --- MEMORY/CAPSULE VERSION GENERATION (FULL + THUMB + DETAIL) ---
        // 2a. Full Optimized (Always)
        const fullQuality = isMain ? 85 : 80;
        await pipeline.clone().webp({ quality: fullQuality }).toFile(fullTmpPath);
        await storageBucket.upload(fullTmpPath, {
            destination: fullStoragePath,
            metadata: {
                contentType: 'image/webp',
                metadata: { isProcessed: 'true' }
            }
        });
        const fullFile = storageBucket.file(fullStoragePath);
        await fullFile.makePublic();
        const fullUrl = `https://storage.googleapis.com/${bucketName}/${fullStoragePath}`;

        let thumbUrl = null;
        let detailUrl = null;

        // 2b. Thumb & Detail (Main photos) - SKIP for Capsules
        if (!isCapsule && isMain) {
            // Thumb
            await pipeline.clone()
                .resize(150, 150, { fit: 'cover' })
                .webp({ quality: 80 })
                .toFile(thumbTmpPath);
            await storageBucket.upload(thumbTmpPath, {
                destination: thumbStoragePath,
                metadata: {
                    contentType: 'image/webp',
                    metadata: { isProcessed: 'true' }
                }
            });
            const thumbFile = storageBucket.file(thumbStoragePath);
            await thumbFile.makePublic();
            thumbUrl = `https://storage.googleapis.com/${bucketName}/${thumbStoragePath}`;

            // Detail (only for memories)
            if (isMemory) {
                await pipeline.clone()
                    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 85 })
                    .toFile(detailTmpPath);
                await storageBucket.upload(detailTmpPath, {
                    destination: detailStoragePath,
                    metadata: {
                        contentType: 'image/webp',
                        metadata: { isProcessed: 'true' }
                    }
                });
                const detailFile = storageBucket.file(detailStoragePath);
                await detailFile.makePublic();
                detailUrl = `https://storage.googleapis.com/${bucketName}/${detailStoragePath}`;
            }
        }

        // 3. Update Firestore
        await db.runTransaction(async (transaction) => {
            if (isMemory) {
                const memoryRef = db.collection(COLLECTIONS.MEMORIES).doc(memoryId);
                const photoRef = memoryRef.collection(COLLECTIONS.PHOTOS).doc(photoId);
                const photoSnap = await transaction.get(photoRef);
                if (photoSnap.exists && photoSnap.data().isProcessed) return;

                const memorySnap = await transaction.get(memoryRef);
                if (!memorySnap.exists) return;

                const memoryData = memorySnap.data();
                
                transaction.set(photoRef, {
                    url: fullUrl,
                    storagePath: fullStoragePath,
                    thumbnailUrl: thumbUrl,
                    detailUrl: detailUrl,
                    isMain,
                    isProcessed: true,
                    updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true });

                const existingPhotos = memoryData.photos || [];
                // Check if photo with this ID already exists in the array
                const photoIndex = existingPhotos.findIndex(p => p.id === photoId);
                const photoEntry = { id: photoId, url: fullUrl, isMain };
                
                let updatedPhotos;
                if (photoIndex === -1) {
                    updatedPhotos = [...existingPhotos, photoEntry];
                } else {
                    updatedPhotos = [...existingPhotos];
                    updatedPhotos[photoIndex] = photoEntry;
                }

                const updates = {
                    photoCount: updatedPhotos.length,
                    updatedAt: FieldValue.serverTimestamp(),
                    photos: updatedPhotos
                };

                if (isMain || !memoryData.mainPhotoUrl) {
                    updates.mainPhotoUrl = fullUrl;
                    updates.mainPhotoThumb = thumbUrl;
                    updates.mainPhotoDetail = detailUrl;
                    updates.mainPhotoStoragePath = fullStoragePath;
                }

                transaction.update(memoryRef, updates);

                if (memoryData.placeId && isMain) {
                    const placeRef = db.collection(COLLECTIONS.PLACES).doc(memoryData.placeId);
                    transaction.update(placeRef, {
                        coverPhotoUrl: thumbUrl,
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                }
            } else if (isSnapshot) {
                // Fix: Snapshots are subcollections of relationships
                const relId = (rootFolder !== 'snapshots' && rootFolder !== 'memories' && rootFolder !== 'capsules') 
                    ? rootFolder 
                    : (metadata.relationshipId || 'legacy');
                
                const photoRef = db.collection(COLLECTIONS.RELATIONSHIPS).doc(relId).collection(COLLECTIONS.INSTANTANEAS).doc(snapshotId);
                const photoSnap = await transaction.get(photoRef);

                if (!photoSnap.exists) {
                    logger.warn(`[onPhotoUploaded] Snapshot doc not found, skipping update: ${snapshotId}`);
                    return;
                }

                if (photoSnap.data().isProcessed) return;

                transaction.update(photoRef, {
                    photoUrl: fullUrl,
                    thumbnailUrl: thumbUrl,
                    storagePath: fullStoragePath,
                    isProcessed: true,
                    updatedAt: FieldValue.serverTimestamp(),
                });
            } else if (isCapsule) {
                const capsuleRef = db.collection(COLLECTIONS.CAPSULES).doc(capsuleId);
                const capsuleSnap = await transaction.get(capsuleRef);
                if (!capsuleSnap.exists) return;

                const capsuleData = capsuleSnap.data();
                const files = capsuleData.files || [];
                
                // Buscar y actualizar el archivo específico en el array
                const updatedFiles = files.map(file => {
                    if (file.storagePath === filePath || file.url.includes(photoId)) {
                        return { 
                            ...file, 
                            url: fullUrl, 
                            storagePath: fullStoragePath, 
                            isProcessed: true 
                        };
                    }
                    return file;
                });

                transaction.update(capsuleRef, {
                    files: updatedFiles,
                    updatedAt: FieldValue.serverTimestamp()
                });
            }
        });

        // 4. Cleanup original if it was converted
        if (filePath !== fullStoragePath) {
            await storageBucket.file(filePath).delete().catch(err => {
                logger.warn(`[onPhotoUploaded] Failed to delete original: ${filePath}`, err);
            });
        }

    } catch (error) {
        logger.error('[onPhotoUploaded] Error:', error);
    } finally {
        [originalTmpPath, fullTmpPath, thumbTmpPath, detailTmpPath].forEach(p => {
            if (fs.existsSync(p)) fs.unlinkSync(p);
        });
    }
});
