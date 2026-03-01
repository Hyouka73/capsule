import { useState, useCallback } from 'react';
import { logToVercel } from '../utils/vercelLogger';

/**
 * useCameraPermissions - Hook to handle WebRTC permission requests.
 * This is used to "pre-warm" the Chrome permission modal so that
 * <input capture="environment"> works reliably on Android 14+.
 */
export function useCameraPermissions() {
    const [status, setStatus] = useState('unknown'); // 'unknown', 'granted', 'denied', 'prompt'
    const [isRequesting, setIsRequesting] = useState(false);

    const checkPermission = useCallback(async () => {
        if (!navigator.permissions || !navigator.permissions.query) {
            setStatus('unknown');
            return;
        }

        try {
            const result = await navigator.permissions.query({ name: 'camera' });
            setStatus(result.state);
            logToVercel('CameraPermissions', 'CHECK', `State: ${result.state}`);

            result.onchange = () => {
                setStatus(result.state);
                logToVercel('CameraPermissions', 'CHANGE', `New state: ${result.state}`);
            };
        } catch (error) {
            logToVercel('CameraPermissions', 'CHECK_ERROR', error.message);
        }
    }, []);

    const requestPermission = useCallback(async () => {
        setIsRequesting(true);
        logToVercel('CameraPermissions', 'REQUEST_START', 'Attempting getUserMedia');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });

            // Immediately stop tracks to release hardware
            stream.getTracks().forEach(track => track.stop());

            setStatus('granted');
            logToVercel('CameraPermissions', 'REQUEST_SUCCESS', 'Permission granted and hardware released');
            return true;
        } catch (error) {
            setStatus('denied');
            logToVercel('CameraPermissions', 'REQUEST_DENIED', error.message);
            return false;
        } finally {
            setIsRequesting(false);
        }
    }, []);

    return {
        status,
        isRequesting,
        checkPermission,
        requestPermission
    };
}
