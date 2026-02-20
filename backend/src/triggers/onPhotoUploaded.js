const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const path = require('path');
const os = require('os');
const fs = require('fs');
const sharp = require('sharp');
const { COLLECTIONS } = require('../config/constants');

/**
 * onPhotoUploaded — Storage trigger
 *
 * Fires when a file is uploaded to:
 *   memories/{memoryId}/photos/{photoId}/original.jpg
 *
 * What it does:
 *   1. Skips thumbnails and non-images (prevents infinite loop)
 *   2. Downloads the file to /tmp
 *   3. Converts HEIC → JPEG if needed (via Sharp)
 *   4. Generates a 400px-wide thumbnail
 *   5. Uploads the thumbnail to {same path}/thumb_400.jpg
 *   6. Updates the photo doc: { thumbnailUrl, thumbnailPath, uploadStatus: "completed" }
 *   7. Updates the memory doc: { photoCount++, mainPhotoUrl if first photo }
 *   8. Updates the place doc: { photoCount++ }
 */
async function onPhotoUploaded(event) {
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const bucket = event.data.bucket;

    // 1. Only process original photos — skip thumbnails
    if (!filePath) return;
    if (!filePath.includes('/photos/')) return;
    if (path.basename(filePath).startsWith('thumb_')) return;
    if (!contentType?.startsWith('image/') && contentType !== 'application/octet-stream') return;

    // Parse the path: memories/{memoryId}/photos/{photoId}/original.jpg
    const parts = filePath.split('/');
    // parts: ['memories', memoryId, 'photos', photoId, 'original.jpg']
    if (parts.length < 5 || parts[0] !== 'memories' || parts[2] !== 'photos') return;

    const memoryId = parts[1];
    const photoId = parts[3];

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
            .rotate() // Auto-rotate based on EXIF orientation
            .resize({ width: 400, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(thumbTmpPath);

        // 5. Upload thumbnail
        const thumbStoragePath = filePath.replace('original.jpg', 'thumb_400.jpg');
        await storageBucket.upload(thumbTmpPath, {
            destination: thumbStoragePath,
            metadata: {
                contentType: 'image/jpeg',
                metadata: { generatedBy: 'onPhotoUploaded' },
            },
        });

        // Get thumbnail public URL (using same pattern as original)
        const thumbFile = storageBucket.file(thumbStoragePath);
        await thumbFile.makePublic();
        const thumbUrl = `https://storage.googleapis.com/${bucket}/${thumbStoragePath}`;

        // 6. Update the photo doc in the subcollection
        const photoRef = db
            .collection(COLLECTIONS.MEMORIES).doc(memoryId)
            .collection(COLLECTIONS.PHOTOS).doc(photoId);

        await photoRef.update({
            thumbnailPath: thumbStoragePath,
            thumbnailUrl: thumbUrl,
            uploadStatus: 'completed',
        });

        // 7. Update the parent memory: photoCount++, mainPhotoUrl if first
        const memoryRef = db.collection(COLLECTIONS.MEMORIES).doc(memoryId);
        const memorySnap = await memoryRef.get();

        if (memorySnap.exists) {
            const memoryData = memorySnap.data();
            const isFirstPhoto = memoryData.photoCount === 0;

            // Get the original URL for mainPhotoUrl
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

            // 8. Update the place: photoCount++
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
        // Cleanup tmp files
        for (const tmpFile of [originalTmpPath, thumbTmpPath]) {
            try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch { /* ignore */ }
        }
    }
}

module.exports = { onPhotoUploaded };
