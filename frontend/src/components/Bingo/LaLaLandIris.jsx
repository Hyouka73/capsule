import React from 'react';
import { motion } from 'framer-motion';
import styles from './LaLaLandIris.module.css';

export default function LaLaLandIris() {
    return (
        <motion.div 
            className={styles.container}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ pointerEvents: 'auto' }} // Blocking clicks during transition
        >
            {/* The Iris Mask */}
            <motion.div 
                className={styles.iris}
                initial={{ clipPath: 'circle(0% at 50% 50%)' }}
                animate={{ 
                    clipPath: [
                        'circle(0% at 50% 50%)',   // Starts closed (invisible)
                        'circle(150% at 50% 50%)', // Opens up (shows sunset)
                        'circle(150% at 50% 50%)', // stays open
                        'circle(0% at 50% 50%)'    // Closes again (reveling reset board)
                    ]
                }}
                transition={{ 
                    duration: 4, 
                    times: [0, 0.4, 0.6, 1],
                    ease: "easeInOut"
                }}
            >
                <div className={styles.sunsetBackground}>
                    <motion.div 
                        className={styles.stars}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.6, 0.6, 0] }}
                        transition={{ duration: 4, times: [0, 0.4, 0.6, 1] }}
                    />
                    <motion.div 
                        className={styles.content}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ 
                            opacity: [0, 1, 1, 0],
                            y: [30, 0, 0, -30]
                        }}
                        transition={{ duration: 4, times: [0, 0.4, 0.6, 1] }}
                    >
                        <motion.span 
                            className={styles.logo}
                            initial={{ opacity: 0 }}
                            animate={{ 
                                opacity: [0, 0.2, 1, 0.5, 1, 1, 0], // Neon flicker
                                textShadow: [
                                    "0 0 0px #ff003c",
                                    "0 0 20px #ff003c, 0 0 40px #ff003c",
                                    "0 0 20px #ff003c, 0 0 40px #ff003c",
                                    "0 0 0px #ff003c"
                                ]
                            }}
                            transition={{ duration: 4, times: [0, 0.45, 0.5, 0.55, 0.6, 0.9, 1] }}
                        >
                            Seb's
                        </motion.span>
                        <p className={styles.quote}>City of stars, are you shining just for me?</p>
                    </motion.div>
                </div>
            </motion.div>
        </motion.div>
    );
}
