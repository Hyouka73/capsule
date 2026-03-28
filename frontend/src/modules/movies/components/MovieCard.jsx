import { motion } from 'framer-motion';
import styles from './MovieCard.module.css';

/**
 * MovieCard — Tarjeta de película con poster y rating.
 */
export default function MovieCard({ movie }) {
    const { title, movieData, eventDate } = movie;
    const { posterPath, rating } = movieData || {};

    const itemVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.9 },
        show: { 
            opacity: 1, y: 0, scale: 1,
            transition: { type: 'spring', damping: 20, stiffness: 300 }
        }
    };

    return (
        <motion.div 
            className={styles.card}
            variants={itemVariants}
            whileHover={{ y: -5, rotate: 1 }}
        >
            <div className={styles.posterWrapper}>
                {posterPath ? (
                    <img src={posterPath} alt={title} className={styles.poster} loading="lazy" />
                ) : (
                    <div className={styles.noPoster}>🎬</div>
                )}
                
                {rating > 0 && (
                    <div className={styles.ratingBadge}>
                        <span className="material-symbols-rounded">star</span>
                        {rating}
                    </div>
                )}
            </div>
            
            <div className={styles.info}>
                <h3 className={styles.movieTitle}>{title}</h3>
                <p className={styles.date}>{new Date(eventDate).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}</p>
            </div>
        </motion.div>
    );
}
