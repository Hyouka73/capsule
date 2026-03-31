import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../MapView.module.css';

export default function ActionFabs({
    isPartner,
    isSearchActive,
    citaContext,
    selectedPlace
}) {
    return (
        <div className={styles.actionsStack}>
            <AnimatePresence>
                {/* ── FAB removido: Ahora está en el Navbar ── */}
            </AnimatePresence>
        </div>
    );
}
