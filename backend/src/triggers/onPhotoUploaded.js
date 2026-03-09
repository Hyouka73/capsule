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
    if (!filePath) return;
    if (!filePath.includes('/originals/')) return;
    if (path.basename(filePath).startsWith('thumb_')) return;
    if (!contentType?.startsWith('image/') && contentType !== 'application/octet-stream') return;

    // Parse the path: memories/{memoryId}/originals/{photoId}.jpg
    const parts = filePath.split('/');
    if (parts.length < 4 || parts[0] !== 'memories' || parts[2] !== 'originals') return;

    const memoryId = parts[1];
    const photoFileName = parts[3]; // e.g. "photoId.jpg"
    const photoId = path.parse(photoFileName).name; // e.g. "photoId"

    const db = getFirestore();
    const storageBucket = getStorage().bucket(bucket);

    // 2. Download original to /tmp
    const tmpDir = os.tmpdir();
    const originalTmpPath = path.join(tmpDir, `${photoId}_original`);
    const thumbTmpPath = path.join(tmpDir, `${photoId}_thumb.jpg`);

    try {
        await storageBucket.file(filePath).download({ destination: originalTmpPath });

        // 3 + 4. Convert to JPEG if HEIC + generate 400px thumbnail
        await sharp(originalTmpPath)
            .rotate()
            .resize({ width: 400, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(thumbTmpPath);

        // 5. Upload thumbnail
        const thumbStoragePath = `memories/${memoryId}/thumbs/${photoId}.jpg`;
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

        // 6. Update/Create the photo doc in the subcollection
        const photoRef = db
            .collection(COLLECTIONS.MEMORIES).doc(memoryId)
            .collection(COLLECTIONS.PHOTOS).doc(photoId);

        await photoRef.set({
            thumbnailPath: thumbStoragePath,
            thumbnailUrl: thumbUrl,
            uploadStatus: 'completed',
            isSnapshot: false, // Ensure it's not a snapshot for collectionGroup filtering
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        // 7. Update the parent memory
        const memoryRef = db.collection(COLLECTIONS.MEMORIES).doc(memoryId);
        const memorySnap = await memoryRef.get();

        if (memorySnap.exists) {
            const memoryData = memorySnap.data();
            const isFirstPhoto = memoryData.photoCount === 0;

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
        }
    } finally {
        for (const tmpFile of [originalTmpPath, thumbTmpPath]) {
            try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch { /* ignore */ }
        }
    }
});
