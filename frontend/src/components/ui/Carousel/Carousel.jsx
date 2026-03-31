import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Carousel.module.css';

/**
 * Enhanced Carousel Component - Built-in Drag Logic (No Sticking)
 */
export default function Carousel({ 
    items = [], 
    initialIndex = 0, 
    onBack,
    onIndexChange,
    renderItem 
}) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    React.useEffect(() => {
        if (onIndexChange) onIndexChange(currentIndex);
    }, [currentIndex, onIndexChange]);

    if (!items || items.length === 0) return null;

    const paginate = (newDirection) => {
        const nextIdx = currentIndex + newDirection;
        if (nextIdx < 0 || nextIdx >= items.length) return;
        setCurrentIndex(nextIdx);
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
                    <AnimatePresence initial={false}>
                        {items.map((item, idx) => {
                            const offset = idx - currentIndex;
                            if (Math.abs(offset) > 1) return null;

                            return (
                                <motion.div
                                    key={idx}
                                    className={`${styles.slide} ${offset === 0 ? styles.activeSlide : styles.sideSlide}`}
                                    style={{ 
                                        left: '50%',
                                        top: '50%'
                                    }}
                                    initial={false}
                                    animate={{
                                        x: offset * 260, // Smashed slightly closer for a 'fuller' feel
                                        translateX: '-50%',
                                        translateY: '-50%',
                                        scale: offset === 0 ? 1 : 0.92, // Larger side cards
                                        opacity: offset === 0 ? 1 : 0.3, // More transparent sides
                                        zIndex: offset === 0 ? 10 : 5,
                                        rotateZ: offset * 5,
                                        z: offset !== 0 ? -200 : 0
                                    }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 280,
                                        damping: 28,
                                        mass: 0.8
                                    }}
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    dragElastic={0.6} // Higher elasticity for a more "loose" interactive feel
                                    onDragEnd={(e, { offset: delta, velocity }) => {
                                        const swipe = Math.abs(delta.x) * velocity.x;
                                        if (swipe < -2000) paginate(1);
                                        else if (swipe > 2000) paginate(-1);
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
                                onClick={() => setCurrentIndex(idx)}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
