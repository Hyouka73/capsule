import React from 'react';
import { AnimatePresence } from 'framer-motion';
import styles from '../MapView.module.css';

export default function ActionFabs({
    isPartner,
    isSearchActive,
    citaContext,
    selectedPlace
}) {
    // Only show fabs if no place is selected and search is not active
    // At the moment, this component acts as a container for potential right-side Fabs
    return (
        <div className={styles.actionsStack}>
            <AnimatePresence>
                {/* PendingWarningBtn removed per user request. Badge moved to BottomNav. */}
            </AnimatePresence>
        </div>
    );
}
