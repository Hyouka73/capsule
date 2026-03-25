import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './MapPin.module.css';

/**
 * Premium MapPin Component
 * Improved with Claymorphism and Framer Motion for high-fidelity animations.
 */
export default function MapPin({ 
    size = 'medium', 
    color = '#F4A7B9', 
    scale = 1.0,
    selected = false, 
    hideIcon = false, 
    hidePulse = false, 
    onClick 
}) {

    // Helper to darken color for volumetric shadows
    const getDarkerColor = (hex) => {
        if (!hex || hex === 'var(--pastel-mint)') return 'rgba(0,0,0,0.15)';
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${Math.floor(r * 0.7)}, ${Math.floor(g * 0.7)}, ${Math.floor(b * 0.7)}, 0.4)`;
    };

    const darkerColor = getDarkerColor(color);

    if (size === 'micro') {
        return (
            <motion.div 
                className={styles.pinWrapper}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.4 }}
                onClick={onClick}
            >
                <div className={styles.microDot} style={{ backgroundColor: color }} />
            </motion.div>
        );
    }

    return (
        <motion.div 
            className={`${styles.pinWrapper} ${selected ? styles.selected : ''}`}
            onClick={onClick}
            initial={{ scale: 0, y: -20, opacity: 0 }}
            animate={{ scale: scale, y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
        >
            {/* Smooth Ripple Effect (Framer Motion) */}
            <AnimatePresence>
                {!hidePulse && (size === 'large' || selected) && (
                    <motion.div 
                        className={styles.ripple}
                        style={{ color }}
                        initial={{ scale: 0.8, opacity: 0.5 }}
                        animate={{ scale: 2.2, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ 
                            duration: 2, 
                            repeat: Infinity, 
                            ease: "easeOut" 
                        }}
                    />
                )}
            </AnimatePresence>

            {/* The Pin Body (Claymorphic) */}
            <motion.div 
                className={`${styles.pin} ${styles[`size-${size}`]}`}
                style={{ backgroundColor: color }}
                whileHover={{ 
                    scale: 1.15,
                    rotate: -40, // Slight squish rotation
                    transition: { type: 'spring', stiffness: 400, damping: 10 }
                }}
                whileTap={{ scale: 0.95 }}
            >

                <div className={styles.innerLight} />
                <div className={styles.innerShadow} />
                
                {!hideIcon && (
                    <motion.div 
                        className={styles.iconContainer}
                        animate={selected ? { scale: [1, 1.3, 1] } : {}}
                        transition={{ repeat: selected ? Infinity : 0, duration: 1.5 }}
                    >
                        {size === 'large' && (
                            <span className="material-symbols-outlined material-icons-filled" style={{ fontSize: '20px', color: 'white' }}>
                                favorite
                            </span>
                        )}
                        {size === 'medium' && (
                            <span className="material-symbols-outlined material-icons-filled" style={{ fontSize: '15px', color: 'white' }}>
                                favorite
                            </span>
                        )}
                        {size === 'small' && (
                            <div className={styles.smallDot} />
                        )}
                    </motion.div>
                )}
            </motion.div>

            {/* Ground Shadow */}
            <motion.div 
                className={styles.shadow} 
                animate={{ 
                    scaleX: selected ? 1.5 : 1,
                    opacity: selected ? 0.3 : 0.15
                }}
            />
        </motion.div>
    );
}

