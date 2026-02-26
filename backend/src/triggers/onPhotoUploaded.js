import { onObjectFinalized } from 'firebase-functions/v2/storage';

export const onPhotoUploaded = onObjectFinalized({ region: 'us-central1' }, async (event) => {
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
            .rotate()
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

        // Get thumbnail public URL
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
