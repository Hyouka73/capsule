import { useState, useRef, useEffect } from 'react';
import Button from '../../../components/ui/Button/Button';
import styles from './MediaUploader.module.css';

/**
 * MediaUploader - Componente para seleccionar y previsualizar imágenes/videos
 * para adjuntar a una cápsula.
 * 
 * @param {object} props
 * @param {Array} props.files - Lista de archivos File
 * @param {function} props.onChange - Callback al cambiar la lista de archivos
 */
export default function MediaUploader({ files = [], onChange }) {
    const [previews, setPreviews] = useState([]);
    const fileInputRef = useRef(null);

    // Sincronizar previsualizaciones con los archivos (pueden ser File o String URLs)
    useEffect(() => {
        const newPreviews = files.map(file => {
            const isFile = file instanceof File || file instanceof Blob;
            return {
                id: Math.random().toString(36).substr(2, 9),
                file: isFile ? file : null,
                url: isFile ? URL.createObjectURL(file) : file,
                type: isFile ? (file.type.startsWith('video/') ? 'video' : 'image') : 'image', // Fallback a image para URLs
                isExisting: !isFile
            };
        });

        setPreviews(newPreviews);

        // Cleanup
        return () => {
            newPreviews.forEach(p => {
                if (p.file) URL.revokeObjectURL(p.url);
            });
        };
    }, [files]);

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length === 0) return;
        
        onChange([...files, ...selectedFiles]);
        e.target.value = ''; // Reset input
    };

    const removeFile = (index) => {
        const newFiles = [...files];
        newFiles.splice(index, 1);
        onChange(newFiles);
    };

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <span className={styles.icon}>📎</span>
                <span className={styles.label}>Archivos Multimedia</span>
                <span className={styles.count}>{files.length} adjuntos</span>
            </div>

            <div className={styles.grid}>
                {previews.map((preview, index) => (
                    <div key={preview.id} className={styles.previewItem}>
                        {preview.type === 'video' ? (
                            <video src={preview.url} className={styles.media} muted />
                        ) : (
                            <img src={preview.url} alt="Vista previa" className={styles.media} />
                        )}
                        <button 
                            type="button" 
                            className={styles.removeBtn}
                            onClick={() => removeFile(index)}
                            aria-label="Eliminar"
                        >
                            ✕
                        </button>
                        {preview.type === 'video' && <span className={styles.videoBadge}>▶</span>}
                    </div>
                ))}

                <button 
                    type="button" 
                    className={styles.addBtn}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <span className={styles.plus}>+</span>
                    <span className={styles.addLabel}>Añadir</span>
                </button>
            </div>

            <input 
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className={styles.hiddenInput}
                onChange={handleFileSelect}
            />
        </div>
    );
}
