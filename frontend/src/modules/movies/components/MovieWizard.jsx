import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchMovies } from '../../../services/tmdbService';
import styles from './MovieWizard.module.css';

/**
 * MovieWizard — Registro paso a paso de películas.
 */
export default function MovieWizard({ onClose, onSave }) {
    const [step, setStep] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState(null);
    
    const [details, setDetails] = useState({
        watchDate: new Date().toISOString().split('T')[0],
        rating: 8,
        placeId: null
    });

    // Búsqueda en tiempo real
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length > 2) {
                setIsSearching(true);
                try {
                    const results = await searchMovies(searchQuery);
                    setSearchResults(results);
                } catch (err) {
                    console.error(err);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectMovie = (movie) => {
        setSelectedMovie(movie);
        setStep(2);
    };

    const handleSave = () => {
        onSave({
            ...selectedMovie,
            ...details
        });
    };

    return (
        <motion.div 
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div 
                className={styles.modal}
                initial={{ y: 100, scale: 0.9, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: 100, scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className={styles.modalHeader}>
                    <h2>{step === 1 ? '¿Qué peli vieron?' : 'Detalles finales'}</h2>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                {/* Content */}
                <div className={styles.modalBody}>
                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div 
                                key="step1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <div className={styles.searchBox}>
                                    <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
                                    <input 
                                        type="text" 
                                        placeholder="Busca por título..." 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                <div className={styles.resultsList}>
                                    {isSearching && <div className={styles.loader}>Buscando... 🎬</div>}
                                    {!isSearching && searchResults.length === 0 && searchQuery.length > 2 && (
                                        <div className={styles.noResults}>No encontramos nada 😅</div>
                                    )}
                                    {searchResults.map(movie => (
                                        <div 
                                            key={movie.tmdbId} 
                                            className={styles.resultItem}
                                            onClick={() => handleSelectMovie(movie)}
                                        >
                                            <div className={styles.miniPoster}>
                                                {movie.posterPath ? <img src={movie.posterPath} alt="" /> : '🎬'}
                                            </div>
                                            <div className={styles.resultInfo}>
                                                <p className={styles.resultTitle}>{movie.title}</p>
                                                <p className={styles.resultYear}>{movie.releaseDate?.split('-')[0]}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className={styles.detailsForm}
                            >
                                <div className={styles.selectedPreview}>
                                    <img src={selectedMovie.posterPath} alt="" className={styles.previewPoster} />
                                    <div>
                                        <h3>{selectedMovie.title}</h3>
                                        <button className={styles.changeBtn} onClick={() => setStep(1)}>Cambiar</button>
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>¿Cuándo la vieron?</label>
                                    <input 
                                        type="date" 
                                        value={details.watchDate} 
                                        onChange={e => setDetails({...details, watchDate: e.target.value})}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>¿Qué nota le dan? ({details.rating}/10)</label>
                                    <input 
                                        type="range" 
                                        min="0" max="10" step="0.5"
                                        value={details.rating}
                                        onChange={e => setDetails({...details, rating: parseFloat(e.target.value)})}
                                    />
                                    <div className={styles.ratingScale}>
                                        <span>💩</span>
                                        <span>😍</span>
                                    </div>
                                </div>

                                <button className={styles.saveBtn} onClick={handleSave}>
                                    ¡Guardar Recuerdo! 🍿
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
}
