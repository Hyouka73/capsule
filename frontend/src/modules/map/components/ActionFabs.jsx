import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../MapView.module.css';

export default function ActionFabs({
    isPartner,
    isSearchActive,
    citaContext,
    selectedPlace,
    onSpontaneousCita,
    fabLabel = "Cita Instantánea ✨",
    icon = "camera_alt"
}) {
    return (
        <div className={styles.actionsStack}>
            <AnimatePresence>
                {isPartner && !isSearchActive && !citaContext && !selectedPlace && (
                    <motion.div
                        className={styles.fab}
                        initial={{ opacity: 0, scale: 0.5, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: 50 }}
                        transition={{ type: 'spring', damping: 15, stiffness: 250 }}
                    >
                        <button className={styles.fabBtn} onClick={onSpontaneousCita}>
                            <span className="material-symbols-outlined">{icon}</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
