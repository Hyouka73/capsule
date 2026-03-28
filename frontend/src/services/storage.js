import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    listAll,
} from 'firebase/storage';
import { storage } from './firebase';

/**
 * Storage service for file uploads (photos, media)
 */

/**
 * Upload a file with progress tracking
 * @param {File} file
 * @param {string} path - Storage path (e.g., 'photos/memoryId/filename.jpg')
 * @param {object} metadata - Custom metadata (e.g., { isMain: 'true' })
 * @param {Function} onProgress - Callback with progress percentage (0-100)
 * @returns {Promise<string>} Download URL
 */
export function uploadFile(file, path, metadata = {}, onProgress = null) {
    return new Promise((resolve, reject) => {
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, file, { customMetadata: metadata });

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                if (onProgress) {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    onProgress(Math.round(progress));
                }
            },
            (error) => reject(error),
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(url);
            }
        );
    });
}

/**
 * Get the download URL for a file
 * @param {string} path
 * @returns {Promise<string>}
 */
export async function getFileURL(path) {
    const storageRef = ref(storage, path);
    return getDownloadURL(storageRef);
}

/**
 * Delete a file from storage
 * @param {string} path
 */
export async function deleteFile(path) {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
}

/**
 * List all files in a storage folder
 * @param {string} path
 * @returns {Promise<Array<{name: string, fullPath: string}>>}
 */
export async function listFiles(path) {
    const storageRef = ref(storage, path);
    const result = await listAll(storageRef);
    return result.items.map(item => ({
        name: item.name,
        fullPath: item.fullPath,
    }));
}

/**
 * Compress and optimize an image before upload (client-side)
 * @param {File|Blob} file 
 * @param {object} options 
 * @returns {Promise<Blob>}
 */
export async function compressImage(file, options = {}) {
    const { 
        maxWidth = 1080, 
        initialQuality = 0.8, 
        mimeType = 'image/webp', 
        maxWeightKb = 500,
        minQuality = 0.5
    } = options;

    const url = URL.createObjectURL(file);
    
    try {
        const img = await new Promise((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = url;
        });

        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
            if (width > height) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            } else {
                width = (width * maxWidth) / height;
                height = maxWidth;
            }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Recursive quality reduction if weight exceeded
        const getOptimizedBlob = async (q) => {
            return new Promise((resolve) => {
                canvas.toBlob(async (blob) => {
                    if (blob.size / 1024 > maxWeightKb && q > minQuality) {
                        // Reduce quality and try again
                        const nextQ = Math.max(minQuality, q - 0.1);
                        resolve(await getOptimizedBlob(nextQ));
                    } else {
                        resolve(blob);
                    }
                }, mimeType, q);
            });
        };

        return await getOptimizedBlob(initialQuality);
    } catch (err) {
        console.error('[storageService] Compression error:', err);
        return file; // Fallback
    } finally {
        URL.revokeObjectURL(url);
    }
}

/**
 * Processes an image and returns both a high-quality original (optimized) 
 * and a small lightweight thumbnail.
 * 
 * @param {File|Blob} file 
 * @returns {Promise<{blob: Blob, thumb: Blob}>}
 */
export async function processImagePair(file) {
    const original = await compressImage(file, { maxWidth: 1080, initialQuality: 0.8, maxWeightKb: 500 });
    const thumb = await compressImage(file, { maxWidth: 400, initialQuality: 0.5, maxWeightKb: 50 });

    return { blob: original, thumb };
}

