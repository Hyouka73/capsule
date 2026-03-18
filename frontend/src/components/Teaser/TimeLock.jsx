import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Countdown from './Countdown';
import './TimeLock.css'; // Just in case we need specific adjustments

// CONFIGURACIÓN: Fecha de desbloqueo
// Formato ISO: YYYY-MM-DDTHH:mm:ss
// Ejemplo: "2026-02-14T08:00:00"
const UNLOCK_DATE = "2024-02-14T08:00:00";

function TimeLock({ children }) {
    const [isLocked, setIsLocked] = useState(true);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const target = new Date(UNLOCK_DATE).getTime();
        const now = Date.now();

        if (now >= target) {
            setIsLocked(false);
        }
        setChecking(false);
    }, []);

    const handleUnlock = () => {
        // Wait a moment for the countdown hitting 0 visual
        setTimeout(() => {
            setIsLocked(false);
        }, 1000);
    };

    if (checking) return null; // Avoid flash

    return (
        <AnimatePresence mode="wait">
            {isLocked ? (
                <motion.div
                    key="locked"
                    className="time-lock-screen"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 1.5, ease: "easeInOut" } }}
                >
                    <div className="lock-content">
                        {/* Reusing Countdown with custom title and date */}
                        <Countdown
                            visible={true}
                            targetDate={UNLOCK_DATE}
                            onComplete={handleUnlock}
                            title="El contenido no está disponible aún. Espera un poquito..."
                        />
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    style={{ width: '100%', height: '100%' }}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default TimeLock;
