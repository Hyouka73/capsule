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
    onOpenCamera,
    onOpenHistory
}) {
    const scrollRef = React.useRef(null);

    const [scrollState, setScrollState] = React.useState({
        left: false,
        right: true
    });

    const updateScrollState = React.useCallback((el) => {
        if (!el) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        setScrollState({
            left: scrollLeft > 10,
            right: scrollLeft < (scrollWidth - clientWidth - 10)
        });
    }, []);

    const handleScroll = (e) => {
        updateScrollState(e.target);
    };

    React.useEffect(() => {
        const slider = scrollRef.current;
        if (!slider) return;

        // Initial check and observer for content changes
        updateScrollState(slider);
        
        const observer = new ResizeObserver(() => updateScrollState(slider));
        observer.observe(slider);

        let isDown = false;
        let startX;
        let scrollLeftPos;

        const startDragging = (e) => {
            isDown = true;
            slider.style.cursor = 'grabbing';
            startX = e.pageX - slider.offsetLeft;
            scrollLeftPos = slider.scrollLeft;
        };

        const stopDragging = () => {
            isDown = false;
            slider.style.cursor = 'grab';
        };

        const move = (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2;
            slider.scrollLeft = scrollLeftPos - walk;
            updateScrollState(slider);
        };

        slider.addEventListener('mousedown', startDragging);
        slider.addEventListener('mouseleave', stopDragging);
        slider.addEventListener('mouseup', stopDragging);
        slider.addEventListener('mousemove', move);

        return () => {
            observer.disconnect();
            slider.removeEventListener('mousedown', startDragging);
            slider.removeEventListener('mouseleave', stopDragging);
            slider.removeEventListener('mouseup', stopDragging);
            slider.removeEventListener('mousemove', move);
        };
    }, [updateScrollState]);

    return (
        <motion.div layout className={styles.topControls}>
            {/* Grid Item 1: Search Wrapper */}
            <motion.div 
                layout
                className={`${styles.searchWrapper} ${isSearchActive ? styles.searchWrapperActive : ''}`}
                transition={{ type: 'spring', stiffness: 260, damping: 25 }}
                onClick={!isSearchActive ? () => setIsSearchActive(true) : undefined}
            >
                <div className={styles.searchFabBtn}>
                    <span className="material-symbols-rounded">search</span>
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

            {/* Grid Item 2: Filters Scroll */}
            {!isSearchActive && (
                <motion.div 
                    key="filters-area"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`${styles.filtersScroll} ${scrollState.left ? styles.hasLeftGradient : ''} ${scrollState.right ? styles.hasRightGradient : ''}`} 
                    ref={scrollRef}
                    onScroll={handleScroll}
                >
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
                                className={`material-symbols-rounded ${styles.chipIcon}`}
                                style={activeFilter === opt.id ? { fontVariationSettings: "'FILL' 1" } : {}}
                            >
                                {opt.icon}
                            </span>
                            {opt.label}
                        </button>
                    ))}
                </motion.div>
            )}

            {/* Grid Item 3: Snapshot Button */}
            {(isPartner || isAdmin) && (
                <motion.div 
                    className={styles.snapshotMapBtn}
                    layout
                >
                    <SnapshotButton
                        onOpenSnapshot={onOpenSnapshot}
                        onOpenCamera={onOpenCamera}
                        onOpenHistory={onOpenHistory}
                    />
                </motion.div>
            )}
        </motion.div>
    );
}
