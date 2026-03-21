import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMovies } from '../../hooks/useMovies';
import MovieCard from './components/MovieCard';
import MovieWizard from './components/MovieWizard';
import LoadingScreen from '../../components/ui/LoadingScreen/LoadingScreen';
import styles from './MoviesView.module.css';

/**
 * MoviesView — Biblioteca de películas vistas juntos.
 */
export default function MoviesView() {
    const { movies, isLoading, addMovie } = useMovies();
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    if (isLoading && movies.length === 0) {
        return <LoadingScreen message="Revisando la cartelera... 🍿" />;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Cine en Pareja</h1>
                <p className={styles.subtitle}>Nuestras historias favoritas, juntos.</p>
            </header>

            {movies.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>🎬</div>
                    <h2>No han registrado pelis aún</h2>
                    <p>Cada película que vean es un recuerdo. ¡Añadan la primera!</p>
                    <button 
                        className={styles.primaryBtn}
                        onClick={() => setIsWizardOpen(true)}
                    >
                        Registrar Película
                    </button>
                </div>
            ) : (
                <motion.div 
                    className={styles.grid}
                    initial="hidden"
                    animate="show"
                    variants={{
                        hidden: { opacity: 0 },
                        show: {
                            opacity: 1,
                            transition: { staggerChildren: 0.08 }
                        }
                    }}
                >
                    {movies.map((movie) => (
                        <MovieCard key={movie.id} movie={movie} />
                    ))}
                </motion.div>
            )}

            {/* Floating Action Button */}
            <motion.button
                className={styles.fab}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsWizardOpen(true)}
            >
                <span className="material-symbols-outlined">add</span>
            </motion.button>

            {/* Movie Registration Wizard */}
            <AnimatePresence>
                {isWizardOpen && (
                    <MovieWizard 
                        onClose={() => setIsWizardOpen(false)} 
                        onSave={async (data) => {
                            const res = await addMovie(data);
                            if (res.success) setIsWizardOpen(false);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
