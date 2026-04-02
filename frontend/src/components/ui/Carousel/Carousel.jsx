import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Carousel.module.css';

/**
 * Enhanced Carousel Component - Optimized for high-speed swiping and responsiveness
 */
export default function Carousel({ 
    items = [], 
    initialIndex = 0, 
    onBack,
    onIndexChange,
    onAttemptNext, // New: Callback when swiping past the end
    onAttemptPrev, // New: Callback when swiping before the start
    renderItem 
}) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [direction, setDirection] = useState(0); 
    const isTransitioning = useRef(false);

    React.useEffect(() => {
        if (onIndexChange) onIndexChange(currentIndex);
    }, [currentIndex, onIndexChange]);

    if (!items || items.length === 0) return null;

    const paginate = (newDirection) => {
        const nextIdx = currentIndex + newDirection;
        
        // Handle boundaries
        if (nextIdx < 0) {
            if (onAttemptPrev) onAttemptPrev();
            return;
        }
        if (nextIdx >= items.length) {
            if (onAttemptNext) onAttemptNext();
            return;
        }

        // Logical debounce (80ms)
        if (isTransitioning.current) return;
        isTransitioning.current = true;
        
        setDirection(newDirection);
        setCurrentIndex(nextIdx);

        setTimeout(() => {
            isTransitioning.current = false;
        }, 80); 
    };

    return (
        <div className={styles.carouselContainer}>
            {onBack && (
                <button className={styles.backBtn} onClick={onBack}>
                    <span className="material-symbols-rounded">arrow_back</span>
                    <span>Volver</span>
                </button>
            )}

            <div className={styles.mainStage}>
                <div className={styles.track}>
                    <AnimatePresence initial={false} custom={direction} mode="popLayout">
                        {items.map((item, idx) => {
                            const offset = idx - currentIndex;
                            if (Math.abs(offset) > 2) return null;

                            const slideKey = item.id || item.url || item.storagePath || idx;

                            return (
                                <motion.div
                                    key={slideKey}
                                    className={`${styles.slide} ${offset === 0 ? styles.activeSlide : styles.sideSlide}`}
                                    style={{ 
                                        left: '50%',
                                        top: '50%'
                                    }}
                                    initial={false}
                                    animate={{
                                        x: offset * 260,
                                        translateX: '-50%',
                                        translateY: '-50%',
                                        scale: offset === 0 ? 1 : 0.92,
                                        opacity: offset === 0 ? 1 : 0.4,
                                        zIndex: offset === 0 ? 10 : 5,
                                        rotateZ: offset * 4,
                                        z: offset !== 0 ? -150 : 0
                                    }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 350,
                                        damping: 30,
                                        mass: 0.6
                                    }}
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    dragElastic={0.4}
                                    dragMomentum={false}
                                    onDragEnd={(e, { offset: delta, velocity }) => {
                                        const SWIPE_THRESHOLD = 40;
                                        const VELOCITY_THRESHOLD = 400;
                                        
                                        if (delta.x < -SWIPE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD) {
                                            paginate(1);
                                        } else if (delta.x > SWIPE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD) {
                                            paginate(-1);
                                        }
                                    }}
                                >
                                    <div className={styles.itemContainer}>
                                        {renderItem ? (
                                            renderItem(item, offset === 0)
                                        ) : (
                                            <img 
                                                src={item?.url || item} 
                                                alt="" 
                                                className={styles.image}
                                                loading="lazy"
                                            />
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>

            <div className={styles.footer}>
                <div className={styles.counter}>
                    {currentIndex + 1} / {items.length}
                </div>
                <div className={styles.indicators}>
                    {items.length > 10 ? (
                        <div className={styles.progressContainer}>
                            <div 
                                className={styles.progressFill} 
                                style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
                            />
                        </div>
                    ) : (
                        items.length > 1 && items.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`${styles.dot} ${idx === currentIndex ? styles.dotActive : ''}`}
                                onClick={() => {
                                    if (!isTransitioning.current) {
                                        setDirection(idx > currentIndex ? 1 : -1);
                                        setCurrentIndex(idx);
                                    }
                                }}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
