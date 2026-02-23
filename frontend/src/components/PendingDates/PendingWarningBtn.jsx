import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import styles from './PendingWarningBtn.module.css';

export default function PendingWarningBtn({ pendingCount, onClick, isVisible }) {
    return (
        <AnimatePresence>
            {isVisible && pendingCount > 0 && (
                <motion.button
                    className={styles.warningBtn}
                    onClick={onClick}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <span className={`material-symbols-outlined ${styles.icon}`}>schedule</span>
                    <span className={styles.text}>{pendingCount} {pendingCount === 1 ? 'cita por guardar' : 'citas por guardar'}</span>
                </motion.button>
            )}
        </AnimatePresence>
    );
}
