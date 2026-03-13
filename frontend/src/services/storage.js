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
 * @param {Function} onProgress - Callback with progress percentage (0-100)
 * @returns {Promise<string>} Download URL
 */
export function uploadFile(file, path, onProgress = null) {
    return new Promise((resolve, reject) => {
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, file);

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
 * Compress an image before upload (client-side)
 * @param {File} file
 * @param {number} maxWidth - Max width in pixels
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<Blob>}
 */
export async function compressImage(file, maxWidth = 1200, quality = 0.8) {
    const url = URL.createObjectURL(file);
    try {
        const img = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Good practice: clear canvas and use smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                img.close(); // Important for memory
                resolve(blob);
            }, 'image/jpeg', quality);
        });
    } catch (err) {
        // Fallback for older browsers or broken blobs
        console.warn('[compressImage] ImageBitmap failed, using legacy:', err);
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(resolve, 'image/jpeg', quality);
            };
            img.src = url;
        });
    } finally {
        URL.revokeObjectURL(url);
    }
}
