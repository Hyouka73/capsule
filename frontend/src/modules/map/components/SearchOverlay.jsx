import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import KawaiiInput from '../../../components/ui/KawaiiInput/KawaiiInput';
import SnapshotButton from '../../snapshots/components/SnapshotButton';
import styles from '../MapView.module.css';

export default function SearchOverlay({
    isSearchActive,
    setIsSearchActive,
    searchQuery,
    setSearchQuery,
    activeFilters,
    activeFilter,
    setActiveFilter,
    placesLoading,
    places,
    onPlaceSelected,
    isPartner,
    isAdmin,
    onOpenSnapshot,
    onOpenCamera
}) {
    return (
        <motion.div layout className={styles.topControls}>
            {/* Search Container - Liquid Growth */}
            <motion.div 
                layout
                className={`${styles.searchWrapper} ${isSearchActive ? styles.searchWrapperActive : ''}`}
                transition={{ type: 'spring', stiffness: 260, damping: 25 }}
                onClick={!isSearchActive ? () => setIsSearchActive(true) : undefined}
            >
                {/* Search Icon - Stays as a guide */}
                <div className={styles.searchFabBtn}>
                    <span className="material-symbols-outlined">search</span>
                </div>

                <AnimatePresence>
                    {isSearchActive && (
                        <motion.div
                            key="input-grow"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className={styles.searchContainer}
                        >
                            <KawaiiInput
                                placeholder="Busca un lugar..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onClear={() => {
                                    setSearchQuery('');
                                    setIsSearchActive(false);
                                }}
                                autoFocus
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Filters and Snapshot - Slide out effect */}
            <AnimatePresence>
                {!isSearchActive && (
                    <motion.div 
                        key="controls-right"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, overflow: 'visible' }}
                    >
                        <div className={styles.filtersScroll}>
                            {activeFilters.map(opt => (
                                <button
                                    key={opt.id}
                                    className={`${styles.chip} ${activeFilter === opt.id ? styles.chipActive : ''}`}
                                    onClick={() => {
                                        setActiveFilter(opt.id);
                                        if (onPlaceSelected) onPlaceSelected(false);
                                    }}
                                >
                                    <span
                                        className={`material-symbols-outlined ${styles.chipIcon}`}
                                        style={activeFilter === opt.id ? { fontVariationSettings: "'FILL' 1" } : {}}
                                    >
                                        {opt.icon}
                                    </span>
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {(isPartner || isAdmin) && (
                            <div className={styles.snapshotMapBtn}>
                                <SnapshotButton
                                    onOpenSnapshot={onOpenSnapshot}
                                    onOpenCamera={onOpenCamera}
                                />
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
