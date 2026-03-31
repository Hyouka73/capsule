import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';
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
    bucket: 'capsule-valentins-day.firebasestorage.app' 
}, async (event) => {
    const filePath = event.data.name; 
    const contentType = event.data.contentType;
    const bucketName = event.data.bucket;
    const metadata = event.data.metadata || {};

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
    
    let photoId;
    let memoryId = null;
    let snapshotId = null;
    let capsuleId = null;

    if (rootFolder === 'memories') {
        if (parts.length < 3) return;
        memoryId = parts[1];
        photoId = path.parse(parts[2]).name;
    } else if (rootFolder === 'snapshots' || parts[1] === 'snapshots') {
        // Handle both: snapshots/id.jpg AND relId/snapshots/id.jpg
        const filename = parts[0] === 'snapshots' ? parts[1] : parts[2];
        if (!filename) return;
        snapshotId = path.parse(filename).name;
        photoId = snapshotId;
    } else if (rootFolder === 'capsules') {
        if (parts.length < 3) return;
        capsuleId = parts[1];
        photoId = path.parse(parts[2]).name;
    } else {
        return;
    }

    const isSnapshot = !!snapshotId;
    const isMemory = !!memoryId;
    const isCapsule = !!capsuleId;

    const db = getFirestore();
    const storageBucket = getStorage().bucket(bucketName);
    
    // Paths
    let fullStoragePath;
    if (isMemory) fullStoragePath = `memories/${memoryId}/${photoId}.webp`;
    else if (isSnapshot) fullStoragePath = `snapshots/${photoId}.webp`;
    else fullStoragePath = `capsules/${capsuleId}/${photoId}.webp`;

    const thumbStoragePath = isMemory
        ? `memories/${memoryId}/thumb_${photoId}.webp`
        : (isSnapshot ? `snapshots/thumb_${snapshotId}.webp` : null);

    const detailStoragePath = isMemory
        ? `memories/${memoryId}/detail_${photoId}.webp`
        : null;

    const tmpDir = os.tmpdir();
    const originalTmpPath = path.join(tmpDir, `${photoId}_orig`);
    const fullTmpPath = path.join(tmpDir, `${photoId}_full.webp`);
    const thumbTmpPath = path.join(tmpDir, `${photoId}_thumb.webp`);
    const detailTmpPath = path.join(tmpDir, `${photoId}_detail.webp`);

    try {
        // Download original
        await storageBucket.file(filePath).download({ destination: originalTmpPath });

        // 2. Process Versions
        const pipeline = sharp(originalTmpPath).rotate();

        // 2a. Full Optimized (Always)
        const fullQuality = isMain ? 85 : 80;
        await pipeline.clone().webp({ quality: fullQuality }).toFile(fullTmpPath);
        await storageBucket.upload(fullTmpPath, {
            destination: fullStoragePath,
            metadata: { contentType: 'image/webp' }
        });
        const fullFile = storageBucket.file(fullStoragePath);
        await fullFile.makePublic();
        const fullUrl = `https://storage.googleapis.com/${bucketName}/${fullStoragePath}`;

        let thumbUrl = null;
        let detailUrl = null;

        // 2b. Thumb & Detail (Main photos or Snapshots) - SKIP for Capsules
        if (!isCapsule && (isMain || isSnapshot)) {
            // Thumb
            await pipeline.clone()
                .resize(150, 150, { fit: 'cover' })
                .webp({ quality: 80 })
                .toFile(thumbTmpPath);
            await storageBucket.upload(thumbTmpPath, {
                destination: thumbStoragePath,
                metadata: { contentType: 'image/webp' }
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
                    metadata: { contentType: 'image/webp' }
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

                if (isMain) {
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
                const photoRef = db.collection(COLLECTIONS.INSTANTANEAS).doc(snapshotId);
                const photoSnap = await transaction.get(photoRef);
                if (photoSnap.exists && photoSnap.data().isProcessed) return;

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

    } catch (error) {
        logger.error('[onPhotoUploaded] Error:', error);
    } finally {
        [originalTmpPath, fullTmpPath, thumbTmpPath, detailTmpPath].forEach(p => {
            if (fs.existsSync(p)) fs.unlinkSync(p);
        });
    }
});
