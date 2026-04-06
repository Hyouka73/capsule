import { useState, useRef, useEffect } from 'react';
import Button from '../../components/ui/Button/Button';
import styles from './AudioCraft.module.css';

export default function AudioCraft({ onAudioChange, existingAudio = null }) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState(existingAudio);
    const [timer, setTimer] = useState(0);
    const [isCountingDown, setIsCountingDown] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerIntervalRef = useRef(null);

    const LIMIT_SECONDS = 300; // 5 minutes

    useEffect(() => {
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                // Convert blob to File for the form
                const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
                onAudioChange(file);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setTimer(0);
            setIsCountingDown(true);

            timerIntervalRef.current = setInterval(() => {
                setTimer(prev => {
                    if (prev >= LIMIT_SECONDS) {
                        stopRecording();
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (err) {
            console.error('Error al acceder al micrófono:', err);
            alert('No se pudo acceder al micrófono. Por favor, revisa los permisos.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setIsCountingDown(false);
            clearInterval(timerIntervalRef.current);
        }
    };

    const resetAudio = () => {
        setAudioUrl(null);
        onAudioChange(null);
        setTimer(0);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={styles.root}>
            {!audioUrl ? (
                <div className={styles.recordControls}>
                    <div className={`${styles.pulseRing} ${isRecording ? styles.animatePulse : ''}`} />
                    <button 
                        type="button"
                        className={`${styles.recordBtn} ${isRecording ? styles.btnRecording : ''}`}
                        onClick={isRecording ? stopRecording : startRecording}
                    >
                        {isRecording ? '⏹' : '🎙️'}
                    </button>
                    
                    <div className={styles.timerDisplay}>
                        <span className={isRecording ? styles.timerActive : ''}>
                            {formatTime(timer)}
                        </span>
                        <span className={styles.limit}> / 5:00</span>
                    </div>
                    
                    <p className={styles.hint}>
                        {isRecording ? 'Grabando tu mensaje...' : 'Toca el micro para empezar a grabar'}
                    </p>
                </div>
            ) : (
                <div className={styles.previewContainer}>
                    <p className={styles.previewTitle}>¡Mensaje de voz listo! ✨</p>
                    <audio src={audioUrl} controls className={styles.audioPlayer} />
                    <button type="button" onClick={resetAudio} className={styles.retryBtn}>
                        Borrar y grabar de nuevo 🔄
                    </button>
                </div>
            )}

            <div className={styles.divider}>o</div>

            <div className={styles.uploadSection}>
                <label className={styles.uploadLabel}>
                    Subir archivo de audio
                    <input 
                        type="file" 
                        accept="audio/*" 
                        onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) onAudioChange(file);
                        }} 
                        className={styles.hiddenInput}
                    />
                </label>
            </div>
        </div>
    );
}
