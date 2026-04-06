import { motion } from 'framer-motion';
import styles from './FilmStripReveal.module.css';

/**
 * FilmStripReveal — Carrete de cine vertical para múltiples fotos/videos.
 * @param {Array} files - Lista de objetos de archivo {url, mimeType, fileName}.
 * @param {string} caption - Texto opcional para el carrete.
 */
export default function FilmStripReveal({ files, caption }) {
    if (!files || files.length === 0) return null;

    return (
        <motion.div 
            className={styles.stripWrapper}
            initial={{ height: 0, opacity: 0, y: 0, scale: 0.9 }}
            animate={{ height: 'auto', opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        >
            <div className={styles.scrollContainer}>
                <div className={styles.filmStrip}>
                    {/* Perforaciones Izquierda */}
                    <div className={styles.perforationsLeft}>
                        {[...Array(12)].map((_, i) => <div key={i} className={styles.hole} />)}
                    </div>

                    <div className={styles.frames}>
                        {caption && <div className={styles.stripCaption}>{caption}</div>}
                        
                        {files.map((file, idx) => {
                            const isVideo = file.mimeType?.includes('video') || /\.(mp4|mov|webm)$/i.test(file.fileName || '');
                            
                            return (
                                <div key={idx} className={styles.frame}>
                                    {isVideo ? (
                                        <video 
                                            src={file.url} 
                                            controls 
                                            playsInline
                                            className={styles.media} 
                                        />
                                    ) : (
                                        <img 
                                            src={file.url} 
                                            alt={file.fileName} 
                                            className={styles.media} 
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Perforaciones Derecha */}
                    <div className={styles.perforationsRight}>
                        {[...Array(12)].map((_, i) => <div key={i} className={styles.hole} />)}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
