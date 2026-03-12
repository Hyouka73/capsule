import React from 'react';
import { motion } from 'framer-motion';
import { useExercise } from '../../hooks/useExercise';
import { useBingo } from '../../hooks/useBingo';
import { useMovies } from '../../hooks/useMovies';
import styles from './DashboardSummaryWidget.module.css';

/**
 * DashboardSummaryWidget
 * 
 * Widget premium que muestra racha, progreso y última película.
 * Incluye indicadores (puntos naranjas) para sincronización pendiente.
 */
export default function DashboardSummaryWidget({ onNavigate }) {
    const { currentStreak, streakAtRisk, hasPendingSync: exercisePending } = useExercise();
    const { progressPercent } = useBingo();
    const { latestMovie, movies, isLoading: moviesLoading } = useMovies();
    
    // Detectar si hay películas pendientes de sincronización
    const moviePending = (movies || []).some(m => m.isPending);

    return (
        <div className={styles.container}>
            {/* 1. MÓDULO EJERCICIO: Racha */}
            <motion.div 
                className={`${styles.card} ${streakAtRisk ? styles.warning : ''}`}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('ejercicio')}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className={styles.iconWrapper}>
                    <span className={styles.mainIcon}>🔥</span>
                    {(exercisePending || streakAtRisk) && (
                        <span className={styles.dot} title={streakAtRisk ? "Racha en riesgo" : "Sincronizando..."}></span>
                    )}
                </div>
                <div className={styles.info}>
                    <span className={styles.label}>Ejercicio</span>
                    <span className={styles.value}>{currentStreak} días</span>
                </div>
            </motion.div>

            {/* 2. MÓDULO BINGO: Progreo */}
            <motion.div 
                className={styles.card}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('bingo')}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <div className={styles.iconWrapper}>
                    <span className={styles.mainIcon}>🎯</span>
                </div>
                <div className={styles.info}>
                    <span className={styles.label}>Bingo</span>
                    <span className={styles.value}>{progressPercent}%</span>
                </div>
            </motion.div>

            {/* 3. MÓDULO CINE: Última película */}
            <motion.div 
                className={styles.card}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('movies')}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div className={styles.iconWrapper}>
                    <span className={styles.mainIcon}>🎬</span>
                    {moviePending && <span className={styles.dot} title="Sincronizando..."></span>}
                </div>
                <div className={styles.info}>
                    <span className={styles.label}>Películas</span>
                    <span className={styles.value}>
                        {moviesLoading ? '...' : (latestMovie ? latestMovie.title : 'Nada aún')}
                    </span>
                </div>
            </motion.div>
        </div>
    );
}
