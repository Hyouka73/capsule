import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { COLLECTIONS } from '../config/constants.js';

export const onPhotoUploaded = onObjectFinalized({ region: 'us-central1' }, async (event) => {
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const bucket = event.data.bucket;

    // 1. Only process original photos — skip thumbnails
    const fileName = path.basename(filePath);
    if (!filePath || fileName.startsWith('thumb_')) return;
    if (!contentType?.startsWith('image/') && contentType !== 'application/octet-stream') return;

    // Parse the path:
    // - memories/{memoryId}/{photoId}.jpg
    // - snapshots/{snapshotId}.jpg
    const parts = filePath.split('/');
    if (parts.length < 2) return;

    const rootFolder = parts[0]; // 'memories' or 'snapshots'
    const parentId = parts[1];   // {memoryId} or {snapshotId}.jpg
    
    let photoId;
    let memoryId = null;
    let snapshotId = null;

    if (rootFolder === 'memories') {
        if (parts.length < 3) return; // memories/{memoryId}/{photoId}.jpg
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
    const storageBucket = getStorage().bucket(bucket);

    // 2. Download original to /tmp
    const tmpDir = os.tmpdir();
    const originalTmpPath = path.join(tmpDir, `${photoId}_original`);
    const thumbTmpPath = path.join(tmpDir, `${photoId}_thumb.jpg`);

    try {
        await storageBucket.file(filePath).download({ destination: originalTmpPath });

        // 3 + 4. Resize + generate 400px thumbnail
        await sharp(originalTmpPath)
            .rotate()
            .resize({ width: 400, transform: true, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(thumbTmpPath);

        // 5. Upload thumbnail
        const thumbStoragePath = isMemory
            ? `memories/${memoryId}/thumb_${photoId}.jpg`
            : `snapshots/thumb_${snapshotId}.jpg`;

        await storageBucket.upload(thumbTmpPath, {
            destination: thumbStoragePath,
            metadata: {
                contentType: 'image/jpeg',
                metadata: { generatedBy: 'onPhotoUploaded' },
            },
        });

        // Get thumbnail public URL
        const thumbFile = storageBucket.file(thumbStoragePath);
        await thumbFile.makePublic();
        const thumbUrl = `https://storage.googleapis.com/${bucket}/${thumbStoragePath}`;

        if (isMemory) {
            // 6. Update/Create the photo doc in the subcollection
            const photoRef = db
                .collection(COLLECTIONS.MEMORIES).doc(memoryId)
                .collection(COLLECTIONS.PHOTOS).doc(photoId);

            await photoRef.set({
                thumbnailPath: thumbStoragePath,
                thumbnailUrl: thumbUrl,
                uploadStatus: 'completed',
                isSnapshot: false,
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });

            // 7. Update the parent memory
            const memoryRef = db.collection(COLLECTIONS.MEMORIES).doc(memoryId);
            
            // Retry hasta 3 veces por si el doc aún no fue creado (race condition safety)
            let memorySnap;
            for (let attempt = 0; attempt < 3; attempt++) {
                memorySnap = await memoryRef.get();
                if (memorySnap.exists) break;
                if (attempt < 2) await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
            }

            if (!memorySnap?.exists) {
                console.warn(`[onPhotoUploaded] Memory ${memoryId} not found after 3 attempts, skipping.`);
                return;
            }

            const memoryData = memorySnap.data();
            const isFirstPhoto = (memoryData.photoCount || 0) === 0;

                const originalFile = storageBucket.file(filePath);
                await originalFile.makePublic();
                const originalUrl = `https://storage.googleapis.com/${bucket}/${filePath}`;

                await memoryRef.update({
                    photoCount: FieldValue.increment(1),
                    ...(isFirstPhoto ? {
                        mainPhotoUrl: originalUrl,
                        mainPhotoStoragePath: filePath,
                    } : {}),
                    updatedAt: FieldValue.serverTimestamp(),
                });

                // 8. Update the place
                if (memoryData.placeId) {
                    const placeRef = db.collection(COLLECTIONS.PLACES).doc(memoryData.placeId);
                    await placeRef.update({
                        photoCount: FieldValue.increment(1),
                        ...(isFirstPhoto ? { coverPhotoUrl: thumbUrl } : {}),
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                }
            } else if (isSnapshot) {
                // Update the snapshot document with the thumbnail
                const snapshotRef = db.collection(COLLECTIONS.INSTANTANEAS).doc(snapshotId);
                await snapshotRef.update({
                    thumbnailUrl: thumbUrl,
                    thumbnailStoragePath: thumbStoragePath,
                    updatedAt: FieldValue.serverTimestamp(),
                });
            }
    } finally {
        for (const tmpFile of [originalTmpPath, thumbTmpPath]) {
            try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch { /* ignore */ }
        }
    }
});
