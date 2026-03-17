import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Carousel.module.css';

/**
 * Enhanced Carousel Component
 * Provides a premium, interactive way to view a collection of photos.
 */
export default function Carousel({ photos = [], initialIndex = 0, onBack }) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [direction, setDirection] = useState(0);

    if (!photos || photos.length === 0) return null;

    const paginate = (newDirection) => {
        setDirection(newDirection);
        setCurrentIndex((prevIndex) => {
            let nextIndex = prevIndex + newDirection;
            if (nextIndex < 0) nextIndex = photos.length - 1;
            if (nextIndex >= photos.length) nextIndex = 0;
            return nextIndex;
        });
    };

    const variants = {
        enter: (direction) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
            scale: 0.9,
            rotateY: direction > 0 ? 45 : -45
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1,
            rotateY: 0
        },
        exit: (direction) => ({
            zIndex: 0,
            x: direction < 0 ? 300 : -300,
            opacity: 0,
            scale: 0.9,
            rotateY: direction < 0 ? 45 : -45
        })
    };

    return (
        <div className={styles.carouselContainer}>
            {onBack && (
                <button className={styles.backBtn} onClick={onBack}>
                    <span className="material-symbols-outlined">arrow_back</span>
                    <span>Volver</span>
                </button>
            )}

            <div className={styles.mainStage}>
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={currentIndex}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 },
                            scale: { duration: 0.3 },
                            rotateY: { duration: 0.4 }
                        }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={1}
                        onDragEnd={(e, { offset, velocity }) => {
                            const swipe = Math.abs(offset.x) * velocity.x;
                            if (swipe < -10000) {
                                paginate(1);
                            } else if (swipe > 10000) {
                                paginate(-1);
                            }
                        }}
                        className={styles.slide}
                    >
                        <img 
                            src={photos[currentIndex]} 
                            alt={`Foto ${currentIndex + 1}`} 
                            className={styles.image}
                        />
                    </motion.div>
                </AnimatePresence>

                {photos.length > 1 && (
                    <>
                        <button className={`${styles.navBtn} ${styles.prev}`} onClick={() => paginate(-1)}>
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <button className={`${styles.navBtn} ${styles.next}`} onClick={() => paginate(1)}>
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </>
                )}
            </div>

            <div className={styles.footer}>
                <div className={styles.counter}>
                    {currentIndex + 1} / {photos.length}
                </div>
                <div className={styles.indicators}>
                    {photos.map((_, idx) => (
                        <div 
                            key={idx} 
                            className={`${styles.dot} ${idx === currentIndex ? styles.dotActive : ''}`}
                            onClick={() => {
                                setDirection(idx > currentIndex ? 1 : -1);
                                setCurrentIndex(idx);
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
